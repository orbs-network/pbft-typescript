import { ElectionTrigger, ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";

export class ViewState {
    private electionTrigger: ElectionTrigger;
    private electionTriggerToken: number;

    constructor(
        electionTriggerFactory: ElectionTriggerFactory,
        public readonly view: number,
        private newLeaderCallback: () => any) {
            this.electionTrigger = electionTriggerFactory(view);
            this.electionTriggerToken = this.electionTrigger.register(newLeaderCallback);
    }

    public dispose(): void {
        this.electionTrigger.unregister(this.electionTriggerToken);
        this.electionTrigger.dispose();
    }
}