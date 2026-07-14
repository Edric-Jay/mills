"use client";

import Link from "next/link";
import type { GamePhase, GameState, Player } from "@mills/game";
import { Board } from "./Board";
import styles from "./GameShell.module.css";

type Props = {
  title: string;
  subtitle?: string;
  state: GameState;
  phase: GamePhase;
  selected: number | null;
  legalTargets: number[];
  onPointClick: (point: number) => void;
  youAre?: Player | null;
  spectatorNote?: string;
  shaking?: boolean;
  roomCode?: string;
  waiting?: boolean;
};

function phaseLabel(phase: GamePhase, turn: Player, mustRemove: boolean): string {
  if (phase === "ended") return "Game over";
  if (mustRemove || phase === "removing") return `${cap(turn)} removes a piece`;
  if (phase === "placing") return `${cap(turn)} places`;
  return `${cap(turn)} moves`;
}

function cap(p: Player) {
  return p === "white" ? "White" : "Black";
}

export function GameShell({
  title,
  subtitle,
  state,
  phase,
  selected,
  legalTargets,
  onPointClick,
  youAre = null,
  spectatorNote,
  shaking,
  roomCode,
  waiting,
}: Props) {
  const millHighlight =
    state.mustRemove || phase === "removing" ? state.turn : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Mills
        </Link>
        <div className={styles.meta}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.sub}>{subtitle}</p>}
          {roomCode && (
            <p className={styles.code}>
              Room <span>{roomCode}</span>
            </p>
          )}
        </div>
      </header>

      <div className={styles.status}>
        {waiting ? (
          <p>Waiting for opponent…</p>
        ) : state.winner ? (
          <p className={styles.winner}>
            {cap(state.winner)} wins
            {state.winReason === "forfeit"
              ? " by forfeit"
              : state.winReason === "immobile"
                ? " — opponent immobilized"
                : state.winReason === "pieces"
                  ? " — under three pieces"
                  : ""}
          </p>
        ) : (
          <p>
            {phaseLabel(phase, state.turn, state.mustRemove)}
            {youAre ? ` · you are ${cap(youAre)}` : ""}
          </p>
        )}
        {spectatorNote && <p className={styles.note}>{spectatorNote}</p>}
      </div>

      <Board
        state={state}
        selected={selected}
        legalTargets={legalTargets}
        onPointClick={onPointClick}
        highlightMillsFor={millHighlight}
        shaking={shaking}
      />

      <div className={styles.counts}>
        <div className={styles.side}>
          <span className={`${styles.dot} ${styles.white}`} />
          White
          <span>
            on board {state.board.filter((c) => c === "white").length}
            {state.toPlace.white > 0 ? ` · to place ${state.toPlace.white}` : ""}
            {state.captured.white > 0 ? ` · lost ${state.captured.white}` : ""}
          </span>
        </div>
        <div className={styles.side}>
          <span className={`${styles.dot} ${styles.black}`} />
          Black
          <span>
            on board {state.board.filter((c) => c === "black").length}
            {state.toPlace.black > 0 ? ` · to place ${state.toPlace.black}` : ""}
            {state.captured.black > 0 ? ` · lost ${state.captured.black}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
