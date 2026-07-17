"use client";

import { useEffect, useId, useRef } from "react";
import type { Player } from "@mills/game";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  winner: Player;
  winReason?: string | null;
  youAre?: Player | null;
  onPlayAgain?: () => void;
  onHome?: () => void;
  onDismiss?: () => void;
};

function reasonText(reason?: string | null) {
  if (reason === "forfeit") return "Opponent forfeited.";
  if (reason === "immobile") return "Opponent has no legal moves.";
  if (reason === "pieces") return "Opponent has fewer than three pieces.";
  return null;
}

export function ResultModal({
  open,
  winner,
  winReason,
  youAre = null,
  onPlayAgain,
  onHome,
  onDismiss,
}: Props) {
  const titleId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const outcome =
    youAre == null
      ? "neutral"
      : winner === youAre
        ? "victory"
        : "defeat";

  const headline =
    outcome === "victory"
      ? "Victory"
      : outcome === "defeat"
        ? "Defeat"
        : `${winner === "white" ? "White" : "Black"} wins`;

  const detail =
    outcome === "victory"
      ? "You won this match."
      : outcome === "defeat"
        ? "Better luck next time."
        : reasonText(winReason) ?? "Match over.";

  const reason = reasonText(winReason);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={() => onDismiss?.()}
    >
      <div
        className={`${styles.dialog} ${styles[outcome]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.eyebrow}>
          {outcome === "neutral" ? "Game over" : "Match result"}
        </p>
        <h2 id={titleId} className={styles.title}>
          {headline}
        </h2>
        <p className={styles.detail}>{detail}</p>
        {reason && outcome !== "neutral" && (
          <p className={styles.reason}>{reason}</p>
        )}
        <div className={styles.actions}>
          {onPlayAgain && (
            <button
              ref={primaryRef}
              type="button"
              className={styles.primary}
              onClick={onPlayAgain}
            >
              Play again
            </button>
          )}
          {onHome && (
            <button
              ref={onPlayAgain ? undefined : primaryRef}
              type="button"
              className={onPlayAgain ? styles.secondary : styles.primary}
              onClick={onHome}
            >
              Back home
            </button>
          )}
          {onDismiss && (
            <button type="button" className={styles.ghost} onClick={onDismiss}>
              Keep looking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
