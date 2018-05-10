import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { PrePreparePayload, PreparePayload } from "./gossip/Payload";
import { Network } from "./nodes/Network";

export class PBFT {
    private prepareLog: { [blockHash: string]: string[] } = {};
    private committedBlocksHashs: string[];
    private prePrepareBlock: Block;
    private f: number;
    private currentView: number = 0;

    constructor(private genesisBlockHash: string, private publicKey: string, private network: Network, private gossip: Gossip, private onNewBlock: (block: Block) => void) {
        const totalNodes = network.nodes.length;
        this.f = Math.floor((totalNodes - 1) / 3);
        this.committedBlocksHashs = [genesisBlockHash];
        this.gossip.subscribe("preprepare", payload => this.onPrePrepare(payload));
        this.gossip.subscribe("prepare", payload => this.onPrepare(payload));
    }

    public suggestBlockAsLeader(block: Block): void {
        this.prePrepareBlock = block;
        this.broadcastPrePrepare(block);
    }

    private broadcastPrePrepare(block: Block): void {
        const payload: PrePreparePayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("preprepare", payload);
    }

    public broadcastPrepare(block: Block): void {
        const payload: PreparePayload = {
            blockHash: block.hash,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("prepare", payload);
    }

    private onPrePrepare(payload: PrePreparePayload): void {
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            if (this.isFromCurrentLeader(payload.view, payload.senderPublicKey)) {
                this.prePrepareBlock = payload.block;
                const preparePayload: PreparePayload = {
                    blockHash: payload.block.hash,
                    senderPublicKey: payload.senderPublicKey,
                    view: payload.view
                };
                this.logPrepare(preparePayload);
                this.broadcastPrepare(payload.block);
                if (this.hasConsensus(payload.block.hash)) {
                    this.commitBlock(payload.block);
                }
            }
        }
    }

    private onPrepare(payload: PreparePayload): void {
        this.logPrepare(payload);
        if (this.isBlockMatchPrePrepareBlock(payload.blockHash)) {
            if (this.hasConsensus(payload.blockHash)) {
                this.commitBlock(this.prePrepareBlock);
            }
        }
    }

    private getLatestConfirmedBlockHash(): string {
        return this.committedBlocksHashs[this.committedBlocksHashs.length - 1];
    }

    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private isFromCurrentLeader(sentView: number, senderPublicKey: string): boolean {
        const senderIdx = this.network.getNodeIdxByPublicKey(senderPublicKey);
        return senderIdx === sentView;
    }

    private isBlockMatchPrePrepareBlock(blockHash: string): boolean {
        return this.prePrepareBlock !== undefined && this.prePrepareBlock.hash === blockHash;
    }

    private hasConsensus(blockHash: string): boolean {
        return (this.prepareLog[blockHash] !== undefined && this.prepareLog[blockHash].length >= this.f * 2);
    }

    private commitBlock(block: Block): void {
        const blockHash = block.hash;
        if (this.committedBlocksHashs.indexOf(blockHash) === -1) {
            this.committedBlocksHashs.push(blockHash);
            this.onNewBlock(block);
        }
    }

    private logPrepare(payload: PreparePayload): void {
        const { blockHash, senderPublicKey } = payload;

        if (this.prepareLog[blockHash] === undefined) {
            this.prepareLog[blockHash] = [senderPublicKey];
        } else {
            if (this.prepareLog[blockHash].indexOf(senderPublicKey) === -1) {
                this.prepareLog[blockHash].push(senderPublicKey);
            }
        }

    }
}