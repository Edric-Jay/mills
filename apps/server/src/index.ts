import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type { GameAction } from "@mills/game";
import {
  cancelQuickMatch,
  createRoom,
  enqueueQuickMatch,
  getRoom,
  handleDisconnect,
  joinRoom,
  leaveRoom,
  playAction,
  publicRoom,
  runBotTurn,
} from "./rooms.js";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/rooms", (req, res) => {
  const mode = req.body?.mode === "bot" ? "bot" : "pvp";
  res.status(201).json({ hint: "Use socket room:create", mode });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const socketRoom = new Map<string, string>();

function emitState(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit("game:state", publicRoom(room));
}

io.on("connection", (socket) => {
  socket.on(
    "room:create",
    (payload: { mode?: "pvp" | "bot" }, cb?: (res: unknown) => void) => {
      cancelQuickMatch(socket.id);
      const mode = payload?.mode === "bot" ? "bot" : "pvp";
      const room = createRoom(socket.id, mode);
      socket.join(room.id);
      socketRoom.set(socket.id, room.id);

      if (mode === "bot") {
        runBotTurn(room);
      }

      cb?.({
        ok: true,
        room: publicRoom(room),
        color: "white" as const,
      });
      emitState(room.id);
    },
  );

  socket.on(
    "room:join",
    (payload: { code: string }, cb?: (res: unknown) => void) => {
      cancelQuickMatch(socket.id);
      const code = String(payload?.code ?? "")
        .trim()
        .toUpperCase();
      const result = joinRoom(code, socket.id);
      if (!result.ok) {
        cb?.({ ok: false, error: result.error });
        return;
      }
      socket.join(result.room.id);
      socketRoom.set(socket.id, result.room.id);
      cb?.({
        ok: true,
        room: publicRoom(result.room),
        color: result.color,
      });
      emitState(result.room.id);
    },
  );

  socket.on("room:quick", (cb?: (res: unknown) => void) => {
    const prev = socketRoom.get(socket.id);
    if (prev) {
      leaveRoom(prev, socket.id);
      socket.leave(prev);
      socketRoom.delete(socket.id);
    }

    const result = enqueueQuickMatch(socket.id);
    if (result.matched && result.room && result.color) {
      socket.join(result.room.id);
      socketRoom.set(socket.id, result.room.id);
      for (const p of result.room.players) {
        const s = io.sockets.sockets.get(p.id);
        if (s) {
          s.join(result.room.id);
          socketRoom.set(p.id, result.room.id);
          s.emit("room:matched", {
            room: publicRoom(result.room),
            color: p.color,
          });
        }
      }
      cb?.({
        ok: true,
        matched: true,
        room: publicRoom(result.room),
        color: result.color,
      });
      emitState(result.room.id);
      return;
    }
    cb?.({ ok: true, matched: false, waiting: true });
  });

  socket.on(
    "game:action",
    (payload: { action: GameAction }, cb?: (res: unknown) => void) => {
      const roomId = socketRoom.get(socket.id);
      if (!roomId) {
        cb?.({ ok: false, error: "Not in a room" });
        return;
      }
      const room = getRoom(roomId);
      if (!room) {
        cb?.({ ok: false, error: "Room not found" });
        return;
      }
      if (
        room.mode === "pvp" &&
        room.players.filter((p) => p.id !== "BOT").length < 2
      ) {
        cb?.({ ok: false, error: "Waiting for opponent" });
        return;
      }

      const result = playAction(room, socket.id, payload.action);
      if (!result.ok) {
        cb?.({ ok: false, error: result.error });
        return;
      }

      runBotTurn(room);
      cb?.({ ok: true, room: publicRoom(room) });
      emitState(room.id);
    },
  );

  socket.on("room:leave", (cb?: (res: unknown) => void) => {
    cancelQuickMatch(socket.id);
    const roomId = socketRoom.get(socket.id);
    if (!roomId) {
      cb?.({ ok: true });
      return;
    }
    const room = leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    socketRoom.delete(socket.id);
    if (room) emitState(room.id);
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    cancelQuickMatch(socket.id);
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    socketRoom.delete(socket.id);
    handleDisconnect(roomId, socket.id, (room) => {
      emitState(room.id);
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mills server listening on http://localhost:${PORT}`);
});
