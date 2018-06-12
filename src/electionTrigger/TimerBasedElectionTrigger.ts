import { ElectionTrigger } from "./ElectionTrigger";

export class TimerBasedElectionTrigger implements ElectionTrigger {
    private listeners: Array<() => void> = [];
    private electionTimer: NodeJS.Timer;

    constructor(private timeout: number) {
        this.startElectionTimer();
    }

    public register(cb: () => void): number {
        this.listeners.push(cb);
        return this.listeners.length - 1;
    }

    public unregister(token: number): void {
        this.listeners[token] = undefined;
    }

    public dispose(): void {
        this.listeners = [];
        this.stopElectionTimer();
    }

    private startElectionTimer(): void {
        this.electionTimer = setInterval(() => this.onTimeout(), this.timeout);
    }

    private stopElectionTimer(): void {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
        }
    }

    private onTimeout(): void {
        for (const listener of this.listeners) {
            if (listener) {
                listener();
            }
        }
    }
}