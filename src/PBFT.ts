import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";

export class PBFT {
    private blocksSuggestionLog: { [blockHash: string]: string[] } = {};
    private confirmedBlocksHash: string[];
    private f: number;

    constructor(private genesisBlockHash: string, private publicKey: string, private totalNodes: number, private gossip: Gossip, private onNewBlock: (block: Block) => void) {
        this.f = Math.floor((totalNodes - 1) / 3);
        this.confirmedBlocksHash = [genesisBlockHash];
        this.gossip.subscribe("suggest-block", payload => this.onSuggestedBlock(payload));
        this.gossip.subscribe("leader-suggested-block", payload => this.onLeaderSuggestedToOthers(payload));
    }

    public suggestBlock(block: Block): void {
        this.gossip.broadcast("suggest-block", { block, senderPublicKey: this.publicKey });
    }

    public informOthersAboutSuggestBlock(block: Block): void {
        this.gossip.broadcast("leader-suggested-block", { block, senderPublicKey: this.publicKey });
    }

    private onSuggestedBlock(payload: SuggestedBlockPayload): void {
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            this.countSuggestedBlock(payload);
            this.informOthersAboutSuggestBlock(payload.block);
        }
    }

    private onLeaderSuggestedToOthers(payload: SuggestedBlockPayload): void {
        this.countSuggestedBlock(payload);
    }

    private getLatestConfirmedBlockHash(): string {
        return this.confirmedBlocksHash[this.confirmedBlocksHash.length - 1];
    }
    
    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private countSuggestedBlock(payload: SuggestedBlockPayload): void {
        const { block, senderPublicKey } = payload;
        const blockHash = block.hash;

        if (this.blocksSuggestionLog[blockHash] === undefined) {
            this.blocksSuggestionLog[blockHash] = [senderPublicKey];
        } else {
            if (this.blocksSuggestionLog[blockHash].indexOf(senderPublicKey) === -1) {
                this.blocksSuggestionLog[blockHash].push(senderPublicKey);
            }
        }

        if (this.blocksSuggestionLog[blockHash].length >= this.f * 2) {
            if (this.confirmedBlocksHash.indexOf(blockHash) === -1) {
                this.confirmedBlocksHash.push(blockHash);
                this.onNewBlock(block);
            }
        }
    }
}