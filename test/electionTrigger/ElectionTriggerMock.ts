import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";

export class ElectionTriggerMock implements ElectionTrigger {
    private view: number = 0;
    private cb: (view: number) => void;

    public registerOnTrigger(cb: (view: number) => void): void {
        this.cb = cb;
    }

    public unregisterOnTrigger(): void {
        this.cb = undefined;
    }

    public setView(view: number): void {
        this.view = view;
    }

    public trigger(): void {
        if (this.cb) {
            this.cb(this.view);
        }
    }
}