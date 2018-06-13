import { Logger, LogTypes } from "../../src/logger/Logger";

export class SilentLogger implements Logger {
    public log(data: LogTypes): void {
        // we are silent
    }
}

