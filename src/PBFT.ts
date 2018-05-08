import { Gossip } from "./gossip/Gossip";
import { CommitPayload } from "./gossip/Payload";

export class PBFT {
    constructor(private gossip: Gossip, private onNewBlock: (block: string) => void) {
        this.gossip.subscribe("commit", payload => this.onCommit(payload));
    }

    public appendBlock(payload: CommitPayload): void {
        this.gossip.broadcast("commit", payload);
    }

    private onCommit(payload: CommitPayload): void {
        this.onNewBlock(payload.block);
    }
}