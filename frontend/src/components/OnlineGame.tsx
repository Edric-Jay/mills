"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInitialState,
  getPhase,
  legalActions,
  legalMovesFrom,
  type GameAction,
  type GameState,
  type Player,
} from "@mills/game";
import { getSocket } from "@/lib/socket";
import { GameShell } from "./GameShell";
import styles from "./OnlineGame.module.css";

type PublicRoom = {
  id: string;
  mode: "pvp" | "bot";
  players: { color: Player; connected: boolean; isBot: boolean }[];
  state: GameState;
  ready: boolean;
};

export function OnlineGame({ roomId }: { roomId: string }) {
  const code = roomId.toUpperCase();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [color, setColor] = useState<Player | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  const state = room?.state ?? createInitialState();
  const phase = getPhase(state);

  const isMyTurn =
    !!color &&
    !state.winner &&
    !!room?.ready &&
    state.turn === color;

  const legalTargets = useMemo(() => {
    if (!isMyTurn) return [] as number[];
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

    return actions
      .filter((a): a is Extract<GameAction, { type: "move" }> => a.type === "move")
      .map((a) => a.from)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }, [state, selected, isMyTurn]);

  const shake = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 400);
  };

  const sendAction = useCallback(
    (action: GameAction) => {
      const socket = getSocket();
      socket.emit(
        "game:action",
        { action },
        (res: { ok: boolean; error?: string; room?: PublicRoom }) => {
          if (!res?.ok) {
            setError(res?.error ?? "Move rejected");
            shake();
            return;
          }
          setError(null);
          setSelected(null);
          if (res.room) setRoom(res.room);
        },
      );
    },
    [],
  );

  const onPointClick = (point: number) => {
    if (!isMyTurn) return;

    if (state.mustRemove) {
      sendAction({ type: "remove", point });
      return;
    }

    if (state.toPlace[state.turn] > 0) {
      sendAction({ type: "place", point });
      return;
    }

    if (selected === null) {
      if (state.board[point] === state.turn) setSelected(point);
      else shake();
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

    sendAction({ type: "move", from: selected, to: point });
  };

  useEffect(() => {
    const socket = getSocket();
    const stored = sessionStorage.getItem(`mills:color:${code}`) as Player | null;
    if (stored === "white" || stored === "black") setColor(stored);

    const onState = (payload: PublicRoom) => {
      if (payload.id !== code) return;
      setRoom(payload);
      setConnecting(false);
    };

    socket.on("game:state", onState);

    // Join (or rejoin) room
    socket.emit("room:join", { code }, (res: {
      ok: boolean;
      error?: string;
      room?: PublicRoom;
      color?: Player;
    }) => {
      if (!res?.ok) {
        // Might already be host from create — try relying on state events
        if (res?.error === "Room is full" || res?.error === "Room not found") {
          setError(res.error);
          setConnecting(false);
          return;
        }
      }
      if (res?.room) {
        setRoom(res.room);
        if (res.color) {
          setColor(res.color);
          sessionStorage.setItem(`mills:color:${code}`, res.color);
        }
      }
      setConnecting(false);
    });

    return () => {
      socket.off("game:state", onState);
    };
  }, [code]);

  if (connecting && !room) {
    return (
      <p className={styles.center}>Connecting to room {code}…</p>
    );
  }

  if (error === "Room not found") {
    return (
      <p className={styles.center}>
        Room {code} not found. <a href="/">Back home</a>
      </p>
    );
  }

  return (
    <>
      <GameShell
        title={room?.mode === "bot" ? "Online vs bot" : "Online match"}
        subtitle={
          room && !room.ready
            ? "Share the code — waiting for opponent"
            : undefined
        }
        roomCode={code}
        waiting={!!room && !room.ready}
        state={state}
        phase={phase}
        selected={selected}
        legalTargets={legalTargets}
        onPointClick={onPointClick}
        youAre={color}
        shaking={shaking}
        onPlayAgain={
          room?.mode === "bot"
            ? () => {
                window.location.href = "/";
              }
            : undefined
        }
      />
      {error && error !== "Room not found" && (
        <p className={styles.err}>{error}</p>
      )}
    </>
  );
}
