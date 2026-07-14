import Link from "next/link";
import styles from "./page.module.css";
import { OnlinePanel } from "@/components/OnlinePanel";

export default function HomePage() {
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
        </div>
      </div>
    </main>
  );
}
