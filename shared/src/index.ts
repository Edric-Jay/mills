export {
  ADJACENCY,
  BOARD_LINES,
  BOARD_SIZE,
  MILLS,
  PIECES_PER_PLAYER,
  POINT_COORDS,
} from "./board.js";

export {
  actionsEqual,
  applyAction,
  canFly,
  createInitialState,
  forfeit,
  getPhase,
  isInMill,
  legalActions,
  legalMovesFrom,
  millCount,
  millsAt,
  piecesOnBoard,
  removablePoints,
} from "./engine.js";

export { chooseAiMove } from "./ai.js";

export type {
  Cell,
  GameAction,
  GamePhase,
  GameState,
  Player,
} from "./types.js";

export { opponent } from "./types.js";
