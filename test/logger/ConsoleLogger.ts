import { Logger } from "../../src/logger/Logger";

export class ConsoleLogger implements Logger {
    public isActive: boolean;

    constructor(private id: string) {
        this.isActive = id === "Node1";
    }

    public log(msg: string): void {
        if (this.isActive) {
            console.log(`[${this.id}]: ${msg}`);
        }
    }

    public logC(msg: string): void {
        this.log(msg);
        this.cycle();
    }

    public cycle(): void {
        if (this.isActive) {
            console.log("");
        }
    }
}