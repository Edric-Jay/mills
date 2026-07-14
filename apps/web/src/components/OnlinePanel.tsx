"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSocket } from "@/lib/socket";
import styles from "./OnlinePanel.module.css";

type CreateRes = {
  ok: boolean;
  error?: string;
  room?: { id: string };
  color?: string;
};

export function OnlinePanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingQuick, setWaitingQuick] = useState(false);

  const go = (roomId: string, color: string) => {
    sessionStorage.setItem(`mills:color:${roomId}`, color);
    router.push(`/game/${roomId}`);
  };

  const create = (mode: "pvp" | "bot") => {
    setBusy(true);
    setError(null);
    const socket = getSocket();
    socket.emit("room:create", { mode }, (res: CreateRes) => {
      setBusy(false);
      if (!res?.ok || !res.room) {
        setError(res?.error ?? "Could not create room");
        return;
      }
      go(res.room.id, res.color ?? "white");
    });
  };

  const join = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter a room code");
      return;
    }
    setBusy(true);
    setError(null);
    const socket = getSocket();
    socket.emit("room:join", { code: trimmed }, (res: CreateRes & { color?: string }) => {
      setBusy(false);
      if (!res?.ok || !res.room) {
        setError(res?.error ?? "Could not join");
        return;
      }
      go(res.room.id, res.color ?? "black");
    });
  };

  const quick = () => {
    setBusy(true);
    setError(null);
    setWaitingQuick(true);
    const socket = getSocket();

    const onMatched = (payload: { room: { id: string }; color: string }) => {
      socket.off("room:matched", onMatched);
      setWaitingQuick(false);
      setBusy(false);
      go(payload.room.id, payload.color);
    };
    socket.on("room:matched", onMatched);

    socket.emit(
      "room:quick",
      (res: {
        ok: boolean;
        matched?: boolean;
        waiting?: boolean;
        room?: { id: string };
        color?: string;
        error?: string;
      }) => {
        if (!res?.ok) {
          socket.off("room:matched", onMatched);
          setBusy(false);
          setWaitingQuick(false);
          setError(res?.error ?? "Quick match failed");
          return;
        }
        if (res.matched && res.room) {
          socket.off("room:matched", onMatched);
          setWaitingQuick(false);
          setBusy(false);
          go(res.room.id, res.color ?? "black");
        }
        // else waiting — stay until room:matched
      },
    );
  };

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.primary}
        disabled={busy}
        onClick={() => create("pvp")}
      >
        Create room
      </button>
      <button
        type="button"
        className={styles.primaryAlt}
        disabled={busy}
        onClick={quick}
      >
        {waitingQuick ? "Searching…" : "Quick match"}
      </button>
      <button
        type="button"
        className={styles.ghost}
        disabled={busy}
        onClick={() => create("bot")}
      >
        Online vs bot
      </button>

      <div className={styles.join}>
        <input
          className={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ROOM CODE"
          maxLength={6}
          aria-label="Room code"
        />
        <button type="button" className={styles.joinBtn} disabled={busy} onClick={join}>
          Join
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
