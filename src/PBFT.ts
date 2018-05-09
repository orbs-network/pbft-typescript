import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";
import { Network } from "./nodes/Network";

export class PBFT {
    private blocksSuggestionLog: { [blockHash: string]: string[] } = {};
    private confirmedBlocksHash: string[];
    private leaderSuggestedBlock: Block;
    private f: number;
    private currentView: number = 0;

    constructor(private genesisBlockHash: string, private publicKey: string, private network: Network, private gossip: Gossip, private onNewBlock: (block: Block) => void) {
        const totalNodes = network.nodes.length;
        this.f = Math.floor((totalNodes - 1) / 3);
        this.confirmedBlocksHash = [genesisBlockHash];
        this.gossip.subscribe("leader-suggest-block", payload => this.onLeaderSuggestedBlock(payload));
        this.gossip.subscribe("node-suggest-block", payload => this.onNodeSuggestedBlock(payload));
    }

    public suggestBlockAsLeader(block: Block): void {
        this.leaderSuggestedBlock = block;
        const payload: SuggestedBlockPayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("leader-suggest-block", payload);
    }

    public informOthersAboutSuggestBlock(block: Block): void {
        const payload: SuggestedBlockPayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("node-suggest-block", payload);
    }

    private onLeaderSuggestedBlock(payload: SuggestedBlockPayload): void {
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            if (this.isFromCurrentLeader(payload.view, payload.senderPublicKey)) {
                this.leaderSuggestedBlock = payload.block;
                this.informOthersAboutSuggestBlock(payload.block);
                if (this.hasConsensus(payload.block.hash)) {
                    this.commitBlock(payload.block);
                }
            }
        }
    }

    private onNodeSuggestedBlock(payload: SuggestedBlockPayload): void {
        this.countSuggestedBlock(payload);
        if (this.isBlockMatchLeaderBlock(payload.block.hash)) {
            if (this.hasConsensus(payload.block.hash)) {
                this.commitBlock(payload.block);
            }
        }
    }

    private getLatestConfirmedBlockHash(): string {
        return this.confirmedBlocksHash[this.confirmedBlocksHash.length - 1];
    }

    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private isFromCurrentLeader(sentView: number, senderPublicKey: string): boolean {
        const senderIdx = this.network.getNodeIdxByPublicKey(senderPublicKey);
        return senderIdx === sentView;
    }

    private isBlockMatchLeaderBlock(blockHash: string): boolean {
        return this.leaderSuggestedBlock !== undefined && this.leaderSuggestedBlock.hash === blockHash;
    }

    private hasConsensus(blockHash: string): boolean {
        return (this.blocksSuggestionLog[blockHash] !== undefined && this.blocksSuggestionLog[blockHash].length >= this.f * 2 - 1);
    }

    private commitBlock(block: Block): void {
        const blockHash = block.hash;
        if (this.confirmedBlocksHash.indexOf(blockHash) === -1) {
            this.confirmedBlocksHash.push(blockHash);
            this.onNewBlock(block);
        }
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

    }
}