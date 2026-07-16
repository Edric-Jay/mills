import type { GameAction, GameState, Player } from "@mills/game";
import {
  applyAction,
  chooseAiMove,
  createInitialState,
  forfeit,
} from "@mills/game";

export type RoomMode = "pvp" | "bot";

export interface RoomPlayer {
  id: string;
  color: Player;
  connected: boolean;
}

export interface Room {
  id: string;
  mode: RoomMode;
  players: RoomPlayer[];
  state: GameState;
  createdAt: number;
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
}

const rooms = new Map<string, Room>();
let quickQueue: string | null = null;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

export function createRoom(
  hostSocketId: string,
  mode: RoomMode = "pvp",
): Room {
  const id = generateRoomCode();
  const room: Room = {
    id,
    mode,
    players: [
      {
        id: hostSocketId,
        color: "white",
        connected: true,
      },
    ],
    state: createInitialState(),
    createdAt: Date.now(),
    disconnectTimers: new Map(),
  };

  if (mode === "bot") {
    room.players.push({
      id: "BOT",
      color: "black",
      connected: true,
    });
  }

  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase());
}

export function deleteRoom(id: string): void {
  const room = rooms.get(id);
  if (!room) return;
  for (const t of room.disconnectTimers.values()) clearTimeout(t);
  rooms.delete(id);
}

export function joinRoom(
  roomId: string,
  socketId: string,
): { ok: true; room: Room; color: Player } | { ok: false; error: string } {
  const room = getRoom(roomId);
  if (!room) return { ok: false, error: "Room not found" };

  const existing = room.players.find((p) => p.id === socketId);
  if (existing) {
    existing.connected = true;
    const timer = room.disconnectTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      room.disconnectTimers.delete(socketId);
    }
    return { ok: true, room, color: existing.color };
  }

  // Reclaim a disconnected human seat (refresh / reconnect)
  const free = room.players.find((p) => !p.connected && p.id !== "BOT");
  if (free) {
    const oldId = free.id;
    const timer = room.disconnectTimers.get(oldId);
    if (timer) {
      clearTimeout(timer);
      room.disconnectTimers.delete(oldId);
    }
    free.id = socketId;
    free.connected = true;
    return { ok: true, room, color: free.color };
  }

  if (room.mode === "bot") {
    return { ok: false, error: "Bot room is full" };
  }

  const humanCount = room.players.filter((p) => p.id !== "BOT").length;
  const maxHumans = 2;
  if (humanCount >= maxHumans) {
    return { ok: false, error: "Room is full" };
  }

  const color: Player = room.players.some((p) => p.color === "white")
    ? "black"
    : "white";
  room.players.push({ id: socketId, color, connected: true });
  return { ok: true, room, color };
}

export function findPlayer(
  room: Room,
  socketId: string,
): RoomPlayer | undefined {
  return room.players.find((p) => p.id === socketId);
}

export function playAction(
  room: Room,
  socketId: string,
  action: GameAction,
): { ok: true; room: Room } | { ok: false; error: string } {
  const player = findPlayer(room, socketId);
  if (!player) return { ok: false, error: "Not in room" };
  if (room.state.winner) return { ok: false, error: "Game over" };
  if (player.color !== room.state.turn) {
    return { ok: false, error: "Not your turn" };
  }

  const result = applyAction(room.state, action);
  if (!result.ok) return { ok: false, error: result.error };
  room.state = result.state;
  return { ok: true, room };
}

export function runBotTurn(room: Room): void {
  if (room.mode !== "bot" || room.state.winner) return;
  while (
    room.state.turn === "black" &&
    !room.state.winner &&
    (room.mode === "bot")
  ) {
    const action = chooseAiMove(room.state, 3);
    if (!action) break;
    const result = applyAction(room.state, action);
    if (!result.ok) break;
    room.state = result.state;
    // Bot may need to remove then continue if somehow still their turn —
    // after remove turn flips to white. If mustRemove stays on black, loop continues.
  }
}

export function handleDisconnect(
  roomId: string,
  socketId: string,
  onForfeit: (room: Room) => void,
  graceMs = 15_000,
): void {
  const room = getRoom(roomId);
  if (!room) return;
  const player = findPlayer(room, socketId);
  if (!player || player.id === "BOT") return;

  player.connected = false;

  const existing = room.disconnectTimers.get(socketId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    room.disconnectTimers.delete(socketId);
    if (player.connected) return;

    if (room.mode === "bot") {
      deleteRoom(roomId);
      return;
    }

    if (!room.state.winner) {
      room.state = forfeit(room.state, player.color);
      onForfeit(room);
    }
    if (room.players.every((p) => !p.connected || p.id === "BOT")) {
      deleteRoom(roomId);
    }
  }, graceMs);

  room.disconnectTimers.set(socketId, timer);
}

export function enqueueQuickMatch(socketId: string): {
  matched: boolean;
  room?: Room;
  color?: Player;
  waiting?: boolean;
} {
  if (quickQueue && quickQueue !== socketId) {
    const hostId = quickQueue;
    quickQueue = null;
    const room = createRoom(hostId, "pvp");
    const join = joinRoom(room.id, socketId);
    if (!join.ok) {
      return { matched: false, waiting: true };
    }
    return { matched: true, room, color: join.color };
  }
  quickQueue = socketId;
  return { matched: false, waiting: true };
}

export function cancelQuickMatch(socketId: string): void {
  if (quickQueue === socketId) quickQueue = null;
}

export function leaveRoom(roomId: string, socketId: string): Room | null {
  const room = getRoom(roomId);
  if (!room) return null;
  cancelQuickMatch(socketId);

  if (room.mode === "bot") {
    deleteRoom(roomId);
    return null;
  }

  if (!room.state.winner) {
    const player = findPlayer(room, socketId);
    if (player) {
      room.state = forfeit(room.state, player.color);
    }
  }

  const idx = room.players.findIndex((p) => p.id === socketId);
  if (idx >= 0) room.players.splice(idx, 1);

  if (room.players.length === 0) {
    deleteRoom(roomId);
    return null;
  }
  return room;
}

export function publicRoom(room: Room) {
  return {
    id: room.id,
    mode: room.mode,
    players: room.players.map((p) => ({
      color: p.color,
      connected: p.connected,
      isBot: p.id === "BOT",
    })),
    state: room.state,
    ready: room.mode === "bot" || room.players.length === 2,
  };
}
