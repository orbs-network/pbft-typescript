import { ElectionTrigger } from "./ElectionTrigger";

export class TimerBasedElectionTrigger implements ElectionTrigger {
    private listeners: Array<() => void> = [];
    private electionTimer: NodeJS.Timer;

    constructor(private timeout: number) {

    }

    public stop(): void {
        this.stopElectionTimer();
    }

    public start(): void {
        this.startElectionTimer();
    }

    public register(cb: () => void): void {
        this.listeners.push(cb);
    }

    private resetElectionTimer(): void {
        this.stopElectionTimer();
        this.startElectionTimer();
    }

    private startElectionTimer(): void {
        this.electionTimer = setTimeout(() => this.onTimeout(), this.timeout);
    }

    private stopElectionTimer(): void {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
        }
    }

    private onTimeout(): void {
        this.listeners.map(listener => listener());
        this.resetElectionTimer();
    }
}