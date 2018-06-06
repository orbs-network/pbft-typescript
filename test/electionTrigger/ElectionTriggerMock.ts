import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";

export class ElectionTriggerMock implements ElectionTrigger {
    private listeners: Array<() => void> = [];

    public stop(): void {
        // do nothing
    }

    public start(): void {
        // do nothing
    }

    public register(cb: () => void): void {
        this.listeners.push(cb);
    }

    public trigger(): void {
        this.listeners.map(listener => listener());
    }
}