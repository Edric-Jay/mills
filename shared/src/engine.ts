import { ADJACENCY, BOARD_SIZE, MILLS, PIECES_PER_PLAYER } from "./board.js";
import {
  type Cell,
  type GameAction,
  type GamePhase,
  type GameState,
  type Player,
  opponent,
} from "./types.js";

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: BOARD_SIZE }, () => null),
    turn: "white",
    toPlace: { white: PIECES_PER_PLAYER, black: PIECES_PER_PLAYER },
    captured: { white: 0, black: 0 },
    mustRemove: false,
    winner: null,
    winReason: null,
  };
}

export function piecesOnBoard(state: GameState, player: Player): number {
  return state.board.filter((c) => c === player).length;
}

export function canFly(state: GameState, player: Player): boolean {
  return state.toPlace[player] === 0 && piecesOnBoard(state, player) === 3;
}

export function isInMill(board: Cell[], point: number, player: Player): boolean {
  return MILLS.some(
    (mill) =>
      mill.includes(point) && mill.every((p) => board[p] === player),
  );
}

export function millsAt(board: Cell[], point: number, player: Player): number {
  return MILLS.filter(
    (mill) =>
      mill.includes(point) && mill.every((p) => board[p] === player),
  ).length;
}

export function getPhase(state: GameState): GamePhase {
  if (state.winner) return "ended";
  if (state.mustRemove) return "removing";
  if (state.toPlace.white > 0 || state.toPlace.black > 0) return "placing";
  return "moving";
}


/** Opponent pieces that may be removed (prefer non-mill) */
export function removablePoints(state: GameState, remover: Player): number[] {
  const target = opponent(remover);
  const theirs: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.board[i] === target) theirs.push(i);
  }
  const notInMill = theirs.filter((p) => !isInMill(state.board, p, target));
  if (notInMill.length > 0) return notInMill;
  return theirs;
}

export function legalMovesFrom(
  state: GameState,
  from: number,
  player: Player,
): number[] {
  if (state.board[from] !== player) return [];
  if (canFly(state, player)) {
    return state.board
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i >= 0);
  }
  return ADJACENCY[from].filter((to) => state.board[to] === null);
}

export function legalActions(state: GameState): GameAction[] {
  if (state.winner || state.board.length !== BOARD_SIZE) return [];

  const player = state.turn;

  if (state.mustRemove) {
    return removablePoints(state, player).map((point) => ({
      type: "remove" as const,
      point,
    }));
  }

  if (state.toPlace[player] > 0) {
    const actions: GameAction[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state.board[i] === null) actions.push({ type: "place", point: i });
    }
    return actions;
  }

  const actions: GameAction[] = [];
  for (let from = 0; from < BOARD_SIZE; from++) {
    if (state.board[from] !== player) continue;
    for (const to of legalMovesFrom(state, from, player)) {
      actions.push({ type: "move", from, to });
    }
  }
  return actions;
}

function checkImmobileLoss(state: GameState): GameState {
  if (state.winner || state.mustRemove) return state;
  if (state.toPlace[state.turn] > 0) return state;
  if (legalActions(state).length === 0) {
    return {
      ...state,
      winner: opponent(state.turn),
      winReason: "immobile",
    };
  }
  return state;
}

function afterPieceRemoved(state: GameState, removedPlayer: Player): GameState {
  const remaining = piecesOnBoard(state, removedPlayer);
  if (state.toPlace[removedPlayer] === 0 && remaining < 3) {
    return {
      ...state,
      winner: opponent(removedPlayer),
      winReason: "pieces",
    };
  }
  return state;
}

export function applyAction(
  state: GameState,
  action: GameAction,
): { ok: true; state: GameState } | { ok: false; error: string } {
  if (state.winner) return { ok: false, error: "Game already over" };

  const legal = legalActions(state);
  const isLegal = legal.some((a) => actionsEqual(a, action));
  if (!isLegal) return { ok: false, error: "Illegal action" };

  const player = state.turn;
  let next: GameState = {
    ...state,
    board: [...state.board],
    toPlace: { ...state.toPlace },
    captured: { ...state.captured },
  };

  if (action.type === "place") {
    next.board[action.point] = player;
    next.toPlace[player] -= 1;
    const formed = millsAt(next.board, action.point, player) > 0;
    if (formed) {
      next.mustRemove = true;
    } else {
      next.turn = opponent(player);
      next = checkImmobileLoss(next);
    }
    return { ok: true, state: next };
  }

  if (action.type === "move") {
    next.board[action.from] = null;
    next.board[action.to] = player;
    const formed = millsAt(next.board, action.to, player) > 0;
    if (formed) {
      next.mustRemove = true;
    } else {
      next.turn = opponent(player);
      next = checkImmobileLoss(next);
    }
    return { ok: true, state: next };
  }

  // remove
  const target = opponent(player);
  next.board[action.point] = null;
  next.captured[target] += 1;
  next.mustRemove = false;
  next = afterPieceRemoved(next, target);
  if (!next.winner) {
    next.turn = opponent(player);
    next = checkImmobileLoss(next);
  }
  return { ok: true, state: next };
}

export function actionsEqual(a: GameAction, b: GameAction): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "place" && b.type === "place") return a.point === b.point;
  if (a.type === "move" && b.type === "move")
    return a.from === b.from && a.to === b.to;
  if (a.type === "remove" && b.type === "remove") return a.point === b.point;
  return false;
}

export function forfeit(state: GameState, forfeiting: Player): GameState {
  if (state.winner) return state;
  return {
    ...state,
    winner: opponent(forfeiting),
    winReason: "forfeit",
    mustRemove: false,
  };
}

/** Debug helper — how many mills a player currently has */
export function millCount(state: GameState, player: Player): number {
  let count = 0;
  for (const mill of MILLS) {
    if (mill.every((p) => state.board[p] === player)) count++;
  }
  return count;
}

