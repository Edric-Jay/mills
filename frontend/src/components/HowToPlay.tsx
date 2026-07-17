"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HowToPlay({ open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          How to play
        </h2>
        <ol className={styles.steps}>
          <li>
            <strong>Place</strong> — Take turns putting your 9 pieces on empty
            points.
          </li>
          <li>
            <strong>Mill</strong> — Get three in a row along a line. Then remove
            one enemy piece (not from a mill, unless all are in mills).
          </li>
          <li>
            <strong>Move</strong> — After all pieces are placed, slide to an
            adjacent empty point. With only 3 pieces left, you may fly to any
            empty point.
          </li>
          <li>
            <strong>Win</strong> — Reduce the opponent to 2 pieces, or leave them
            with no legal moves.
          </li>
        </ol>
        <p className={styles.hint}>
          Green highlights are legal spots. Tap a piece, then a highlighted
          point to move.
        </p>
        <button
          ref={closeRef}
          type="button"
          className={styles.primary}
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
