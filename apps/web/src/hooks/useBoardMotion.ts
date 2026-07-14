"use client";

import { useEffect, useRef, useState } from "react";
import type { Cell, Player } from "@mills/game";
import { BOARD_SIZE } from "@mills/game";

export type BoardMotion =
  | { kind: "place"; to: number; player: Player; key: number }
  | { kind: "move"; from: number; to: number; player: Player; key: number }
  | { kind: "remove"; from: number; player: Player; key: number };

let motionSeq = 0;

function boardsEqual(a: readonly Cell[], b: readonly Cell[]) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Diff consecutive boards into a single place / move / remove animation cue. */
export function useBoardMotion(board: readonly Cell[]): BoardMotion | null {
  const prevRef = useRef<readonly Cell[] | null>(null);
  const [motion, setMotion] = useState<BoardMotion | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = board;
      return;
    }
    if (boardsEqual(prev, board)) return;

    const vacated: number[] = [];
    const occupied: number[] = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
      if (prev[i] && !board[i]) vacated.push(i);
      if (!prev[i] && board[i]) occupied.push(i);
    }

    prevRef.current = board;
    const key = ++motionSeq;

    if (vacated.length === 1 && occupied.length === 1) {
      const from = vacated[0];
      const to = occupied[0];
      const player = board[to] as Player;
      if (prev[from] === player) {
        setMotion({ kind: "move", from, to, player, key });
        return;
      }
    }

    if (vacated.length === 0 && occupied.length === 1) {
      const to = occupied[0];
      setMotion({ kind: "place", to, player: board[to] as Player, key });
      return;
    }

    if (vacated.length === 1 && occupied.length === 0) {
      const from = vacated[0];
      setMotion({ kind: "remove", from, player: prev[from] as Player, key });
      return;
    }

    setMotion(null);
  }, [board]);

  return motion;
}
