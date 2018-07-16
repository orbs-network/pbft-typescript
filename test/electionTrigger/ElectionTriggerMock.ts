import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";

export class ElectionTriggerMock implements ElectionTrigger {
    private listeners: Array<() => void> = [];

    public register(cb: () => void): number {
        this.listeners.push(cb);
        return this.listeners.length - 1;
    }

    public unregister(token: number): void {
        this.listeners[token] = undefined;
    }

    public trigger(): void {
        for (const listener of this.listeners) {
            if (listener) {
                listener();
            }
        }
    }

    public dispose(): void {
        this.listeners = [];
    }
}