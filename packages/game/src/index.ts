export {
  ADJACENCY,
  BOARD_LINES,
  BOARD_SIZE,
  MILLS,
  PIECES_PER_PLAYER,
  POINT_COORDS,
} from "./board";

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
} from "./engine";

export { chooseAiMove } from "./ai";

export type {
  Cell,
  GameAction,
  GamePhase,
  GameState,
  Player,
} from "./types";

export { opponent } from "./types";
