import { Logger } from "../../src/logger/Logger";

export class SilentLogger implements Logger {
    public log(msg: string): void {
        // we are silent
        // console.log(msg);
    }
}

