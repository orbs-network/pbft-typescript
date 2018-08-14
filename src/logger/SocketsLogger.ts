import * as socketsIOClient from "socket.io-client";
import { Logger, LogTypes } from "./Logger";

const io = socketsIOClient("http://localhost:9090", { query: { id: "SocketsLogger" } });

export class SocketsLogger implements Logger {

    constructor(private id: string) {
        io.emit("NEW-TEST");
    }

    public async log(logData: LogTypes): Promise<void> {
        io.emit("LOG", { id: this.id, logData });
    }
}