import { ElectionTrigger } from "./ElectionTrigger";

export class TimerBasedElectionTrigger implements ElectionTrigger {
    private listener: () => void;
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
        this.listener = cb;
    }

    public snooze(): void {
        this.resetElectionTimer();
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
        this.listener();
        this.resetElectionTimer();
    }
}