import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";

export class PBFT {
    private blocksSuggestionLog: { [block: string]: string[] } = {};
    private confirmedBlocks: string[] = [];
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
        const {block, senderPublicKey} = payload;
        if (this.blocksSuggestionLog[block] === undefined) {
            this.blocksSuggestionLog[block] = [senderPublicKey];
        } else {
            if (this.blocksSuggestionLog[block].indexOf(senderPublicKey) === -1) {
                this.blocksSuggestionLog[block].push(senderPublicKey);
            }
        }

        if (this.blocksSuggestionLog[block].length >= this.f * 2) {
            if (this.confirmedBlocks.indexOf(block) === -1) {
                this.confirmedBlocks.push(block);
                this.onNewBlock(block);
            }
        }
    }
}