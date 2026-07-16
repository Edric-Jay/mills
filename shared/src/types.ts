export type Player = "white" | "black";
export type Cell = Player | null;

/** Top-level game phase for UX */
export type GamePhase = "placing" | "moving" | "removing" | "ended";

export type GameAction =
  | { type: "place"; point: number }
  | { type: "move"; from: number; to: number }
  | { type: "remove"; point: number };

export interface GameState {
  board: Cell[];
  turn: Player;
  /** Pieces each side still has to place */
  toPlace: Record<Player, number>;
  /** Pieces removed from the board (captured) */
  captured: Record<Player, number>;
  /** When set, current player must remove an opponent piece */
  mustRemove: boolean;
  winner: Player | null;
  /** Why the game ended */
  winReason: "pieces" | "immobile" | "forfeit" | null;
}

export function opponent(p: Player): Player {
  return p === "white" ? "black" : "white";
}
