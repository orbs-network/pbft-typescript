import { Logger, LogTypes } from "../../src/logger/Logger";

export class ConsoleLogger implements Logger {

    constructor(private id: string) {
    }

    public log(data: LogTypes): void {
        const dataStr = JSON.stringify(data, undefined, 2);
        console.log(`[${this.id}]: ${dataStr}`);
    }
}