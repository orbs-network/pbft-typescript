import { ElectionTrigger } from "./ElectionTrigger";

export class TimerBasedElectionTrigger implements ElectionTrigger {
    private view: number = undefined;
    private cb: (view: number) => void;
    private electionTimer: NodeJS.Timer;

    constructor(private minTimeout: number) {
    }

    public registerOnTrigger(cb: (view: number) => void): void {
        this.cb = cb;
    }

    public unregisterOnTrigger(): void {
        this.cb = undefined;
        this.stop();
    }

    public setView(view: number): void {
        if (this.view !== view) {
            this.view = view;
            this.stop();
            this.electionTimer = setInterval(() => this.onTimeout(), 2 ** view * this.minTimeout);
        }
    }

    private stop(): void {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
            this.electionTimer = undefined;
        }
    }

    private onTimeout(): void {
        if (this.cb) {
            this.cb(this.view);
        }
    }
}