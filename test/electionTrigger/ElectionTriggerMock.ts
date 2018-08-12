import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";

export class ElectionTriggerMock implements ElectionTrigger {
    private cb: () => void;

    public start(cb: () => void): void {
        this.cb = cb;
    }

    public stop(): void {
        this.cb = undefined;
    }

    public trigger(): void {
        if (this.cb) {
            this.cb();
        }
    }
}