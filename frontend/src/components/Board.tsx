"use client";

import { useEffect, useState } from "react";
import {
  BOARD_LINES,
  POINT_COORDS,
  type Cell,
  type GameState,
  type Player,
  isInMill,
} from "@mills/game";
import { useBoardMotion, type BoardMotion } from "@/hooks/useBoardMotion";
import styles from "./Board.module.css";

type Props = {
  state: GameState;
  selected: number | null;
  legalTargets: number[];
  onPointClick: (point: number) => void;
  highlightMillsFor?: Player | null;
  shaking?: boolean;
};

type FlyPos = { x: number; y: number; lift: number };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function PieceVisual({
  player,
  className,
  cx = 0,
  cy = 0,
  r = 3.6,
  opacity = 1,
}: {
  player: Player;
  className?: string;
  cx?: number;
  cy?: number;
  r?: number;
  opacity?: number;
}) {
  return (
    <circle
      className={className}
      cx={cx}
      cy={cy}
      r={r}
      opacity={opacity}
      fill={player === "white" ? "var(--white-piece)" : "var(--black-piece)"}
      stroke={player === "white" ? "var(--white-edge)" : "var(--black-edge)"}
      strokeWidth="0.7"
      filter="url(#pieceShadow)"
    />
  );
}

/** Move animation uses SVG attribute transforms only — CSS scale on SVG circles breaks layout. */
function FlyingPiece({ motion }: { motion: Extract<BoardMotion, { kind: "move" }> }) {
  const from = POINT_COORDS[motion.from];
  const to = POINT_COORDS[motion.to];
  const [pos, setPos] = useState<FlyPos>({ x: from.x, y: from.y, lift: 0 });
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 520;
    const peak = 5.5;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(t);
      const lift = Math.sin(Math.PI * t) * peak;
      setPos({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e - lift,
        lift,
      });
      setPulse(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion.key, from.x, from.y, to.x, to.y]);

  const scale = 1 + pos.lift * 0.04;
  const trailOpacity = 0.85 * (1 - pulse);
  const ghostOpacity = Math.max(0, 0.9 * (1 - pulse * 1.4));
  const destOpacity = pulse < 0.35 ? pulse / 0.35 : Math.max(0, 1 - (pulse - 0.35) / 0.65);
  const destR = 3.2 + pulse * 2.8;

  return (
    <g className={styles.flyLayer} pointerEvents="none">
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={motion.player === "white" ? "var(--white-edge)" : "var(--highlight)"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2.5 2"
        opacity={trailOpacity}
      />
      <circle
        cx={from.x}
        cy={from.y}
        r={3.2 + pulse * 2}
        fill="none"
        stroke={motion.player === "white" ? "var(--white-edge)" : "var(--black-edge)"}
        strokeWidth="0.85"
        strokeDasharray="2 1.5"
        opacity={ghostOpacity}
      />
      <circle
        cx={to.x}
        cy={to.y}
        r={destR}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.9"
        opacity={destOpacity}
      />
      <g transform={`translate(${pos.x} ${pos.y}) scale(${scale})`}>
        <PieceVisual player={motion.player} />
      </g>
    </g>
  );
}

function RemovingPiece({ motion }: { motion: Extract<BoardMotion, { kind: "remove" }> }) {
  const c = POINT_COORDS[motion.from];
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setT(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion.key]);

  const e = easeOutCubic(t);
  const y = c.y - 10 * e;
  const scale = 1 - 0.8 * e;
  const opacity = 1 - e;

  return (
    <g className={styles.flyLayer} pointerEvents="none">
      <g transform={`translate(${c.x} ${y}) scale(${scale})`}>
        <PieceVisual player={motion.player} opacity={opacity} />
      </g>
    </g>
  );
}

export function Board({
  state,
  selected,
  legalTargets,
  onPointClick,
  highlightMillsFor = null,
  shaking = false,
}: Props) {
  const legalSet = new Set(legalTargets);
  const motion = useBoardMotion(state.board);

  const hideAt =
    motion?.kind === "move"
      ? motion.to
      : motion?.kind === "remove"
        ? motion.from
        : null;

  return (
    <div className={`${styles.wrap} ${shaking ? "shake" : ""}`}>
      <svg
        className={styles.svg}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Nine Men's Morris board"
      >
        <defs>
          <radialGradient id="boardFill" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f7f1e8" />
            <stop offset="100%" stopColor="#e2d4c2" />
          </radialGradient>
          <filter id="pieceShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodOpacity="0.35" />
          </filter>
        </defs>

        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="3"
          fill="url(#boardFill)"
          stroke="var(--line)"
          strokeWidth="0.6"
        />

        {BOARD_LINES.map(([a, b]) => {
          const pa = POINT_COORDS[a];
          const pb = POINT_COORDS[b];
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="var(--line)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          );
        })}

        {POINT_COORDS.map((coord, i) => {
          const cell = state.board[i] as Cell;
          const isLegal = legalSet.has(i);
          const isSelected = selected === i;
          const inMill =
            highlightMillsFor &&
            cell === highlightMillsFor &&
            isInMill(state.board, i, highlightMillsFor);
          const showPiece = cell && hideAt !== i;
          const isLanding = motion?.kind === "place" && motion.to === i;

          return (
            <g
              key={i}
              className={`${styles.point}${inMill ? ` ${styles.millGlow}` : ""}`}
              onClick={() => onPointClick(i)}
              role="button"
              tabIndex={0}
              aria-label={`Point ${i + 1}${cell ? `, ${cell}` : ""}${isLegal ? ", legal" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPointClick(i);
                }
              }}
            >
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isLegal || isSelected ? 4.2 : 3.2}
                fill={
                  isSelected
                    ? "rgba(196, 92, 38, 0.35)"
                    : isLegal
                      ? "rgba(94, 168, 154, 0.35)"
                      : "#d9cbb8"
                }
                stroke={isLegal ? "var(--highlight)" : "var(--line)"}
                strokeWidth={isSelected || isLegal ? 0.9 : 0.55}
              />
              {showPiece && (
                <PieceVisual
                  player={cell}
                  cx={coord.x}
                  cy={coord.y}
                  className={isLanding ? styles.pieceLand : undefined}
                />
              )}
              <circle cx={coord.x} cy={coord.y} r={7.5} fill="transparent" />
            </g>
          );
        })}

        {motion?.kind === "move" && (
          <FlyingPiece key={motion.key} motion={motion} />
        )}
        {motion?.kind === "remove" && (
          <RemovingPiece key={motion.key} motion={motion} />
        )}
      </svg>
    </div>
  );
}
