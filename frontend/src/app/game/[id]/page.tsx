"use client";

import { OnlineGame } from "@/components/OnlineGame";
import { use } from "react";

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <OnlineGame roomId={id} />;
}
