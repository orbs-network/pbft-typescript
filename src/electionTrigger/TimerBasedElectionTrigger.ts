import { ElectionTrigger } from "./ElectionTrigger";

export class TimerBasedElectionTrigger implements ElectionTrigger {
    private cb: () => void;
    private electionTimer: NodeJS.Timer;

    constructor(private timeout: number) {
    }

    public start(cb: () => void): void {
        this.cb = cb;
        this.startElectionTimer();
    }

    public stop(): void {
        this.cb = undefined;
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
        if (this.cb) {
            this.cb();
        }
    }
}