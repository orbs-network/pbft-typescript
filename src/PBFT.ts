import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";

export class PBFT {
    private blocksSuggestionLog: { [block: string]: string[] } = {};
    private f: number;

    constructor(private totalNodes: number, private gossip: Gossip, private onNewBlock: (block: string) => void) {
        this.f = Math.floor((totalNodes - 1) / 3);
        this.gossip.subscribe("suggest-block", payload => this.onSuggestedBlock(payload));
    }

    public appendBlock(payload: SuggestedBlockPayload): void {
        this.gossip.broadcast("suggest-block", payload);
    }

    private onSuggestedBlock(payload: SuggestedBlockPayload): void {
        if (this.blocksSuggestionLog[payload.block] === undefined) {
            this.blocksSuggestionLog[payload.block] = [payload.senderPublicKey];
        } else {
            this.blocksSuggestionLog[payload.block].push(payload.senderPublicKey);
        }

        if (this.blocksSuggestionLog[payload.block].length >= this.f * 2) {
            this.onNewBlock(payload.block);
        }
    }
}