import { io } from "socket.io-client";

export const socket = io("http://177.200.115.10:4000", {
  autoConnect: true,
});
