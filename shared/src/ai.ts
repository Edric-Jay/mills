import { ADJACENCY, MILLS } from "./board.js";
import {
  applyAction,
  canFly,
  getPhase,
  legalActions,
  millsAt,
  piecesOnBoard,
} from "./engine.js";
import type { GameAction, GameState, Player } from "./types.js";
import { opponent } from "./types.js";

function evaluate(state: GameState, perspective: Player): number {
  if (state.winner === perspective) return 100_000;
  if (state.winner === opponent(perspective)) return -100_000;

  const me = perspective;
  const them = opponent(perspective);

  const myPieces = piecesOnBoard(state, me) + state.toPlace[me];
  const theirPieces = piecesOnBoard(state, them) + state.toPlace[them];

  let score = (myPieces - theirPieces) * 25;
  score += (state.captured[them] - state.captured[me]) * 40;

  for (const mill of MILLS) {
    const mine = mill.filter((p) => state.board[p] === me).length;
    const theirs = mill.filter((p) => state.board[p] === them).length;
    const empty = mill.filter((p) => state.board[p] === null).length;
    if (mine === 3) score += 18;
    if (theirs === 3) score -= 18;
    if (mine === 2 && empty === 1) score += 8;
    if (theirs === 2 && empty === 1) score -= 10;
  }

  const phase = getPhase(state);
  if (phase === "moving" || phase === "placing") {
    let myMob = 0;
    let theirMob = 0;
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === me) {
        if (canFly(state, me)) {
          myMob += state.board.filter((c) => c === null).length;
        } else {
          myMob += ADJACENCY[i].filter((t) => state.board[t] === null).length;
        }
      }
      if (state.board[i] === them) {
        if (canFly(state, them)) {
          theirMob += state.board.filter((c) => c === null).length;
        } else {
          theirMob += ADJACENCY[i].filter((t) => state.board[t] === null)
            .length;
        }
      }
    }
    score += (myMob - theirMob) * 2;
  }

  return score;
}

function orderActions(state: GameState, actions: GameAction[]): GameAction[] {
  return [...actions].sort(
    (a, b) => actionPriority(state, b) - actionPriority(state, a),
  );
}

function actionPriority(state: GameState, action: GameAction): number {
  if (action.type === "remove") return 50;
  const player = state.turn;
  if (action.type === "place") {
    const board = [...state.board];
    board[action.point] = player;
    return millsAt(board, action.point, player) * 20;
  }
  if (action.type === "move") {
    const board = [...state.board];
    board[action.from] = null;
    board[action.to] = player;
    return millsAt(board, action.to, player) * 20;
  }
  return 0;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  perspective: Player,
): number {
  if (depth === 0 || state.winner) {
    return evaluate(state, perspective);
  }

  const maximizing = state.turn === perspective;
  const actions = orderActions(state, legalActions(state));
  if (actions.length === 0) {
    return evaluate(state, perspective);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const action of actions) {
      const result = applyAction(state, action);
      if (!result.ok) continue;
      const val = minimax(result.state, depth - 1, alpha, beta, perspective);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, maxEval);
      if (beta <= alpha) break;
    }
    return maxEval === -Infinity ? evaluate(state, perspective) : maxEval;
  }

  let minEval = Infinity;
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const val = minimax(result.state, depth - 1, alpha, beta, perspective);
    minEval = Math.min(minEval, val);
    beta = Math.min(beta, minEval);
    if (beta <= alpha) break;
  }
  return minEval === Infinity ? evaluate(state, perspective) : minEval;
}

export function chooseAiMove(
  state: GameState,
  depth = 3,
): GameAction | null {
  const actions = orderActions(state, legalActions(state));
  if (actions.length === 0) return null;

  const perspective = state.turn;
  let best: GameAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const score = minimax(result.state, depth - 1, -Infinity, Infinity, perspective);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }

  return best;
}
