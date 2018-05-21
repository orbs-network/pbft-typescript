import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";

export class ElectionTriggerMock implements ElectionTrigger {
    private listener: () => void;

    public stop(): void {
        // do nothing
    }

    public start(): void {
        // do nothing
    }

    public register(cb: () => void): void {
        this.listener = cb;
    }

    public snooze(): void {
        // do nothing
    }

    public trigger(): void {
        this.listener();
    }
}