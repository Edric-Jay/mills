"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./page.module.css";
import { OnlinePanel } from "@/components/OnlinePanel";
import { HowToPlay } from "@/components/HowToPlay";

export default function HomePage() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <main className={styles.hero}>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.content}>
        <p className={styles.eyebrow}>Nine Men&apos;s Morris</p>
        <h1 className={styles.brand}>Mills</h1>
        <p className={styles.tagline}>
          Place nine. Form mills. Clear the board — or pin your opponent still.
        </p>
        <div className={styles.cta}>
          <OnlinePanel />
          <div className={styles.localRow}>
            <Link className={styles.secondary} href="/local?mode=hotseat">
              Local 2-player
            </Link>
            <Link className={styles.secondary} href="/local?mode=ai">
              vs AI
            </Link>
          </div>
          <button
            type="button"
            className={styles.helpLink}
            onClick={() => setHelpOpen(true)}
          >
            How to play
          </button>
        </div>
      </div>
      <HowToPlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
