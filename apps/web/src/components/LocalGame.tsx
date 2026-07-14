"use client";

import { useLocalGame } from "@/hooks/useLocalGame";
import { GameShell } from "./GameShell";
import styles from "./LocalGame.module.css";

export function LocalGame({ mode }: { mode: "hotseat" | "ai" }) {
  const game = useLocalGame(mode);

  return (
    <>
      <GameShell
        title={mode === "ai" ? "vs AI" : "Local match"}
        subtitle={
          mode === "ai"
            ? game.aiThinking
              ? "AI is thinking…"
              : "You play White"
            : "Pass-and-play on one device"
        }
        state={game.state}
        phase={game.phase}
        selected={game.selected}
        legalTargets={game.legalTargets}
        onPointClick={game.onPointClick}
        youAre={mode === "ai" ? game.humanColor : null}
        shaking={game.shaking}
      />
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={game.reset}>
          New game
        </button>
      </div>
    </>
  );
}
