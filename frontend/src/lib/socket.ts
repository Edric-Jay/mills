"use client";

import { io, type Socket } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}
