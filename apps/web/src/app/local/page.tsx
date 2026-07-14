"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LocalGame } from "@/components/LocalGame";

function LocalInner() {
  const params = useSearchParams();
  const mode = params.get("mode") === "ai" ? "ai" : "hotseat";
  return <LocalGame mode={mode} />;
}

export default function LocalPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", textAlign: "center" }}>Loading…</p>}>
      <LocalInner />
    </Suspense>
  );
}
