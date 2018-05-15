import { Logger } from "../../src/logger/Logger";

export class ConsoleLogger implements Logger {
    public log(msg: string): void {
        console.log(msg);
    }
}

