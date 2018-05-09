import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { SuggestedBlockPayload } from "./gossip/Payload";
import { Network } from "./nodes/Network";

export class PBFT {
    private prepareLog: { [blockHash: string]: string[] } = {};
    private committedBlocksHash: string[];
    private leaderSuggestedBlock: Block;
    private f: number;
    private currentView: number = 0;

    constructor(private genesisBlockHash: string, private publicKey: string, private network: Network, private gossip: Gossip, private onNewBlock: (block: Block) => void) {
        const totalNodes = network.nodes.length;
        this.f = Math.floor((totalNodes - 1) / 3);
        this.committedBlocksHash = [genesisBlockHash];
        this.gossip.subscribe("preprepare", payload => this.onPrePrepare(payload));
        this.gossip.subscribe("prepare", payload => this.onPrepare(payload));
    }

    public suggestBlockAsLeader(block: Block): void {
        this.leaderSuggestedBlock = block;
        this.broadcastPrePrepare(block);
    }

    private broadcastPrePrepare(block: Block): void {
        const payload: SuggestedBlockPayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("preprepare", payload);
    }

    public broadcastPrepare(block: Block): void {
        const payload: SuggestedBlockPayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("prepare", payload);
    }

    private onPrePrepare(payload: SuggestedBlockPayload): void {
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            if (this.isFromCurrentLeader(payload.view, payload.senderPublicKey)) {
                this.leaderSuggestedBlock = payload.block;
                this.broadcastPrepare(payload.block);
                if (this.hasConsensus(payload.block.hash)) {
                    this.commitBlock(payload.block);
                }
            }
        }
    }

    private onPrepare(payload: SuggestedBlockPayload): void {
        this.logPrepare(payload);
        if (this.isBlockMatchLeaderBlock(payload.block.hash)) {
            if (this.hasConsensus(payload.block.hash)) {
                this.commitBlock(payload.block);
            }
        }
    }

    private getLatestConfirmedBlockHash(): string {
        return this.committedBlocksHash[this.committedBlocksHash.length - 1];
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
        return (this.prepareLog[blockHash] !== undefined && this.prepareLog[blockHash].length >= this.f * 2 - 1);
    }

    private commitBlock(block: Block): void {
        const blockHash = block.hash;
        if (this.committedBlocksHash.indexOf(blockHash) === -1) {
            this.committedBlocksHash.push(blockHash);
            this.onNewBlock(block);
        }
    }

    private logPrepare(payload: SuggestedBlockPayload): void {
        const { block, senderPublicKey } = payload;
        const blockHash = block.hash;

        if (this.prepareLog[blockHash] === undefined) {
            this.prepareLog[blockHash] = [senderPublicKey];
        } else {
            if (this.prepareLog[blockHash].indexOf(senderPublicKey) === -1) {
                this.prepareLog[blockHash].push(senderPublicKey);
            }
        }

    }
}