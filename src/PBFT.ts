import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";

export class PBFT {
    private blocksSuggestionLog: { [block: string]: string[] } = {};
    private f: number;

    constructor(private publicKey: string, private totalNodes: number, private gossip: Gossip, private onNewBlock: (block: string) => void) {
        this.f = Math.floor((totalNodes - 1) / 3);
        this.gossip.subscribe("suggest-block", payload => this.onLeaderSuggestedBlock(payload));
        this.gossip.subscribe("leader-suggested-block", payload => this.onLeaderSuggestedToOthers(payload));
    }

    public suggestBlock(block: string): void {
        this.gossip.broadcast("suggest-block", {block, senderPublicKey: this.publicKey});
    }

    public informOthersAboutSuggestBlock(block: string): void {
        this.gossip.broadcast("leader-suggested-block", {block, senderPublicKey: this.publicKey});
    }

    private onLeaderSuggestedBlock(payload: SuggestedBlockPayload): void {
        this.countSuggestedBlock(payload);
        this.informOthersAboutSuggestBlock(payload.block);
    }

    private onLeaderSuggestedToOthers(payload: SuggestedBlockPayload): void {
        this.countSuggestedBlock(payload);
    }

    private countSuggestedBlock(payload: SuggestedBlockPayload): void {
        if (this.blocksSuggestionLog[payload.block] === undefined) {
            this.blocksSuggestionLog[payload.block] = [payload.senderPublicKey];
        } else {
            if (this.blocksSuggestionLog[payload.block].indexOf(payload.senderPublicKey) === -1) {
                this.blocksSuggestionLog[payload.block].push(payload.senderPublicKey);
            }
        }

        if (this.blocksSuggestionLog[payload.block].length >= this.f * 2) {
            this.onNewBlock(payload.block);
        }
    }
}