import { Logger } from "../../src/logger/Logger";

export class ConsoleLogger implements Logger {
    constructor(private id: string) {

    }
    public log(msg: string): void {
        console.log(`[${this.id}]: ${msg}`);
    }
}

