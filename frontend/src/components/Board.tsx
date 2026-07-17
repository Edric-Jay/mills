"use client";

import { useLayoutEffect, useRef } from "react";
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

/** Animate via DOM refs — avoids per-frame React re-renders that mobile Safari drops. */
function FlyingPiece({ motion }: { motion: Extract<BoardMotion, { kind: "move" }> }) {
  const from = POINT_COORDS[motion.from];
  const to = POINT_COORDS[motion.to];
  const pieceRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGLineElement>(null);
  const ghostRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 520;
    const peak = 5.5;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(t);
      const lift = Math.sin(Math.PI * t) * peak;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e - lift;
      const scale = 1 + lift * 0.04;

      pieceRef.current?.setAttribute(
        "transform",
        `translate(${x} ${y}) scale(${scale})`,
      );

      if (trailRef.current) {
        trailRef.current.setAttribute("opacity", String(0.85 * (1 - t)));
      }
      if (ghostRef.current) {
        ghostRef.current.setAttribute("r", String(3.2 + t * 2));
        ghostRef.current.setAttribute("opacity", String(Math.max(0, 0.9 * (1 - t * 1.4))));
      }
      if (ringRef.current) {
        const destOpacity =
          t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);
        ringRef.current.setAttribute("r", String(3.2 + t * 2.8));
        ringRef.current.setAttribute("opacity", String(destOpacity));
      }

      if (t < 1) frame = requestAnimationFrame(tick);
    };

    pieceRef.current?.setAttribute(
      "transform",
      `translate(${from.x} ${from.y}) scale(1)`,
    );
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion.key, from.x, from.y, to.x, to.y]);

  return (
    <g className={styles.flyLayer} pointerEvents="none">
      <line
        ref={trailRef}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={motion.player === "white" ? "var(--white-edge)" : "var(--highlight)"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2.5 2"
        opacity={0.85}
      />
      <circle
        ref={ghostRef}
        cx={from.x}
        cy={from.y}
        r={3.2}
        fill="none"
        stroke={motion.player === "white" ? "var(--white-edge)" : "var(--black-edge)"}
        strokeWidth="0.85"
        strokeDasharray="2 1.5"
        opacity={0.9}
      />
      <circle
        ref={ringRef}
        cx={to.x}
        cy={to.y}
        r={3.2}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.9"
        opacity={0}
      />
      <g ref={pieceRef}>
        <PieceVisual player={motion.player} />
      </g>
    </g>
  );
}

function RemovingPiece({ motion }: { motion: Extract<BoardMotion, { kind: "remove" }> }) {
  const c = POINT_COORDS[motion.from];
  const groupRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(progress);
      const y = c.y - 10 * e;
      const scale = 1 - 0.8 * e;

      if (groupRef.current) {
        groupRef.current.setAttribute(
          "transform",
          `translate(${c.x} ${y}) scale(${scale})`,
        );
        groupRef.current.setAttribute("opacity", String(1 - e));
      }

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    if (groupRef.current) {
      groupRef.current.setAttribute("transform", `translate(${c.x} ${c.y}) scale(1)`);
      groupRef.current.setAttribute("opacity", "1");
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion.key, c.x, c.y]);

  return (
    <g className={styles.flyLayer} pointerEvents="none">
      <g ref={groupRef}>
        <PieceVisual player={motion.player} />
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
