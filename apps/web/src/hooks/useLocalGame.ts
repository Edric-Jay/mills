"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyAction,
  chooseAiMove,
  createInitialState,
  getPhase,
  legalActions,
  legalMovesFrom,
  type GameAction,
  type GameState,
  type Player,
} from "@mills/game";

export function useLocalGame(mode: "hotseat" | "ai") {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const phase = getPhase(state);
  const humanColor: Player = "white";

  const isHumanTurn = useMemo(() => {
    if (state.winner) return false;
    if (mode === "hotseat") return true;
    return state.turn === humanColor;
  }, [mode, state.winner, state.turn]);

  const legalTargets = useMemo(() => {
    if (!isHumanTurn) return [] as number[];
    const actions = legalActions(state);

    if (state.mustRemove) {
      return actions
        .filter((a): a is Extract<GameAction, { type: "remove" }> => a.type === "remove")
        .map((a) => a.point);
    }

    if (state.toPlace[state.turn] > 0) {
      return actions
        .filter((a): a is Extract<GameAction, { type: "place" }> => a.type === "place")
        .map((a) => a.point);
    }

    if (selected !== null) {
      return legalMovesFrom(state, selected, state.turn);
    }

    // Show points that have movable pieces
    return actions
      .filter((a): a is Extract<GameAction, { type: "move" }> => a.type === "move")
      .map((a) => a.from)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }, [state, selected, isHumanTurn]);

  const shake = useCallback(() => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 400);
  }, []);

  const commit = useCallback(
    (action: GameAction) => {
      const result = applyAction(state, action);
      if (!result.ok) {
        shake();
        return;
      }
      setSelected(null);
      setState(result.state);
    },
    [state, shake],
  );

  const onPointClick = useCallback(
    (point: number) => {
      if (!isHumanTurn || state.winner) return;

      if (state.mustRemove) {
        commit({ type: "remove", point });
        return;
      }

      if (state.toPlace[state.turn] > 0) {
        commit({ type: "place", point });
        return;
      }

      // Moving
      if (selected === null) {
        if (state.board[point] === state.turn) {
          setSelected(point);
        } else {
          shake();
        }
        return;
      }

      if (point === selected) {
        setSelected(null);
        return;
      }

      if (state.board[point] === state.turn) {
        setSelected(point);
        return;
      }

      commit({ type: "move", from: selected, to: point });
    },
    [isHumanTurn, state, selected, commit, shake],
  );

  // AI turn
  useEffect(() => {
    if (mode !== "ai" || state.winner) return;
    if (state.turn !== "black") return;

    setAiThinking(true);
    const t = window.setTimeout(() => {
      setState((current) => {
        if (current.turn !== "black" || current.winner) return current;
        const action = chooseAiMove(current, 3);
        if (!action) return current;
        const result = applyAction(current, action);
        if (!result.ok) return current;
        return result.state;
      });
      setAiThinking(false);
      setSelected(null);
    }, 450);

    return () => window.clearTimeout(t);
  }, [mode, state]);

  const reset = () => {
    setState(createInitialState());
    setSelected(null);
  };

  return {
    state,
    phase,
    selected,
    legalTargets,
    onPointClick,
    shaking,
    aiThinking,
    reset,
    humanColor,
  };
}
