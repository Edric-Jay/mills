"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Cell, Player } from "@mills/game";
import { BOARD_SIZE } from "@mills/game";

export type BoardMotion =
  | { kind: "place"; to: number; player: Player; key: number }
  | { kind: "move"; from: number; to: number; player: Player; key: number }
  | { kind: "remove"; from: number; player: Player; key: number };

const MOTION_MS: Record<BoardMotion["kind"], number> = {
  place: 380,
  move: 520,
  remove: 420,
};

let motionSeq = 0;

function boardsEqual(a: readonly Cell[], b: readonly Cell[]) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function detectMotion(
  prev: readonly Cell[],
  board: readonly Cell[],
): BoardMotion | null {
  const vacated: number[] = [];
  const occupied: number[] = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (prev[i] && !board[i]) vacated.push(i);
    if (!prev[i] && board[i]) occupied.push(i);
  }

  const key = ++motionSeq;

  if (vacated.length === 1 && occupied.length === 1) {
    const from = vacated[0];
    const to = occupied[0];
    const player = board[to] as Player;
    if (prev[from] === player) {
      return { kind: "move", from, to, player, key };
    }
  }

  if (vacated.length === 0 && occupied.length === 1) {
    const to = occupied[0];
    return { kind: "place", to, player: board[to] as Player, key };
  }

  if (vacated.length === 1 && occupied.length === 0) {
    const from = vacated[0];
    return { kind: "remove", from, player: prev[from] as Player, key };
  }

  return null;
}

/** Diff consecutive boards into a single place / move / remove animation cue. */
export function useBoardMotion(board: readonly Cell[]): BoardMotion | null {
  const prevRef = useRef<readonly Cell[] | null>(null);
  const [motion, setMotion] = useState<BoardMotion | null>(null);
  const clearTimer = useRef<number | null>(null);

  // useLayoutEffect runs before paint so mobile never flashes the final position first
  useLayoutEffect(() => {
    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = board;
      return;
    }
    if (boardsEqual(prev, board)) return;

    prevRef.current = board;
    const next = detectMotion(prev, board);
    setMotion(next);

    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    if (next) {
      clearTimer.current = window.setTimeout(() => {
        setMotion((current) => (current?.key === next.key ? null : current));
        clearTimer.current = null;
      }, MOTION_MS[next.kind]);
    }

    return () => {
      if (clearTimer.current !== null) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
    };
  }, [board]);

  return motion;
}
