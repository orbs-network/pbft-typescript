import { Block } from "./Block";
import { Config } from "./Config";
import { Gossip } from "./gossip/Gossip";
import { NewViewPayload, PrePreparePayload, PreparePayload, ViewChangePayload } from "./gossip/Payload";
import { logger } from "./logger/Logger";
import { Network } from "./network/Network";

export class PBFT {
    private prepareLog: { [blockHash: string]: string[] } = {};
    private viewChangeLog: { [view: number]: string[] } = {};
    private committedBlocksHashs: string[];
    private prePrepareBlock: Block;
    private leaderChangeTimer: NodeJS.Timer;
    private f: number;
    private currentView: number = 0;
    private publicKey: string;
    private network: Network;
    private gossip: Gossip;
    private onNewBlock: (block: Block) => void;

    constructor(private config: Config) {
        this.publicKey = config.publicKey;
        this.network = config.network;
        this.gossip = config.gossip;
        this.onNewBlock = config.onNewBlock;
        logger.log(`PBFT instace initiating, publicKey:${this.publicKey}`);

        this.resetLeaderChangeTimer();
        this.f = Math.floor((this.network.getNodesCount() - 1) / 3);
        this.committedBlocksHashs = [config.genesisBlockHash];
        this.gossip.subscribe("preprepare", payload => this.onPrePrepare(payload));
        this.gossip.subscribe("prepare", payload => this.onPrepare(payload));
        this.gossip.subscribe("view-change", payload => this.onViewChange(payload));
    }

    public suggestBlockAsLeader(block: Block): void {
        this.prePrepareBlock = block;
        this.broadcastPrePrepare(block);
    }

    public isLeader(): boolean {
        return this.network.getNodeIdxByPublicKey(this.publicKey) === this.currentView;
    }

    private resetLeaderChangeTimer(): void {
        if (this.leaderChangeTimer) {
            clearTimeout(this.leaderChangeTimer);
        }
        this.leaderChangeTimer = setTimeout(() => this.onLeaderChangeTimeout(), 300);
    }

    private leaderPublicKey(): string {
        const idx = this.currentView % this.network.getNodesCount();
        return this.network.getNodeByIdx(idx).publicKey;
    }

    private onLeaderChangeTimeout(): void {
        this.currentView++;
        logger.log(`[${this.publicKey}], onLeaderChangeTimeout, new view:${this.currentView}`);
        const payload: ViewChangePayload = { newView: this.currentView, senderPublicKey: this.publicKey };
        this.gossip.unicast(this.leaderPublicKey(), "view-change", payload);
        this.resetLeaderChangeTimer();
    }

    private broadcastPrePrepare(block: Block): void {
        logger.log(`[${this.publicKey}], broadcastPrePrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PrePreparePayload = {
            block,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("preprepare", payload);
    }

    private broadcastPrepare(block: Block): void {
        logger.log(`[${this.publicKey}], broadcastPrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PreparePayload = {
            blockHash: block.hash,
            senderPublicKey: this.publicKey,
            view: this.currentView
        };
        this.gossip.broadcast("prepare", payload);
    }

    private async onPrePrepare(payload: PrePreparePayload): Promise<void> {
        logger.log(`[${this.publicKey}], onPrePrepare blockHash:${payload.block.hash}, senderPublicKey:${payload.senderPublicKey}, view:${payload.view}`);
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            if (this.isFromCurrentLeader(payload.senderPublicKey)) {
                if (this.config.validateBlock !== undefined) {
                    const isValidBlock = await this.config.validateBlock(payload.block);
                    if (!isValidBlock) {
                        logger.log(`[${this.publicKey}], onPrePrepare, block is invalid`);
                        return;
                    }
                }
                this.prePrepareBlock = payload.block;
                const preparePayload: PreparePayload = {
                    blockHash: payload.block.hash,
                    senderPublicKey: payload.senderPublicKey,
                    view: payload.view
                };
                this.logPrepare(preparePayload);
                this.broadcastPrepare(payload.block);
                if (this.isPrepared(payload.block.hash)) {
                    logger.log(`[${this.publicKey}], onPrePrepare, found enough votes, there's consensus. commtting block (${this.prePrepareBlock.hash})`);
                    this.commitBlock(this.prePrepareBlock);
                }
            } else {
                logger.log(`[${this.publicKey}], onPrePrepare, block rejected because it was not sent by the current leader (${this.currentView})`);
            }
        } else {
            logger.log(`[${this.publicKey}], onPrePrepare, block rejected because it's not pointing to the previous block`);
        }
    }

    private onViewChange(payload: ViewChangePayload): void {
        logger.log(`[${this.publicKey}], onViewChange senderPublicKey:${payload.senderPublicKey}, newView:${payload.newView}`);
        this.logViewChange(payload);
        if (this.isElected(payload.newView)) {
            const newViewPayload: NewViewPayload = { view: payload.newView };
            this.gossip.broadcast("new-view", newViewPayload);
        }
    }

    private onPrepare(payload: PreparePayload): void {
        logger.log(`[${this.publicKey}], onPrepare blockHash:${payload.blockHash}, senderPublicKey:${payload.senderPublicKey}, view:${payload.view}`);
        this.logPrepare(payload);
        if (this.isBlockMatchPrePrepareBlock(payload.blockHash)) {
            if (this.isPrepared(payload.blockHash)) {
                logger.log(`[${this.publicKey}], onPrepare, found enough votes, there's consensus. commtting block (${this.prePrepareBlock.hash})`);
                this.commitBlock(this.prePrepareBlock);
            }
        } else {
            logger.log(`[${this.publicKey}], onPrepare, block rejected because it does not match the onPrePare block`);
        }
    }

    private getLatestConfirmedBlockHash(): string {
        return this.committedBlocksHashs[this.committedBlocksHashs.length - 1];
    }

    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private isFromCurrentLeader(senderPublicKey: string): boolean {
        return this.leaderPublicKey() === senderPublicKey;
    }

    private isBlockMatchPrePrepareBlock(blockHash: string): boolean {
        return this.prePrepareBlock !== undefined && this.prePrepareBlock.hash === blockHash;
    }

    private isElected(newView: number): boolean {
        return (this.viewChangeLog[newView] !== undefined && this.viewChangeLog[newView].length >= this.f * 2 + 1);
    }

    private isPrepared(blockHash: string): boolean {
        return (this.prepareLog[blockHash] !== undefined && this.prepareLog[blockHash].length >= this.f * 2);
    }

    private commitBlock(block: Block): void {
        this.resetLeaderChangeTimer();
        const blockHash = block.hash;
        if (this.committedBlocksHashs.indexOf(blockHash) === -1) {
            this.committedBlocksHashs.push(blockHash);
            this.onNewBlock(block);
        }
    }

    private logViewChange(payload: ViewChangePayload): void {
        const { newView, senderPublicKey } = payload;

        if (this.viewChangeLog[newView] === undefined) {
            this.viewChangeLog[newView] = [senderPublicKey];
        } else {
            if (this.viewChangeLog[newView].indexOf(senderPublicKey) === -1) {
                this.viewChangeLog[newView].push(senderPublicKey);
            }
        }
        logger.log(`[${this.publicKey}], logViewChange, view change logged. [${this.viewChangeLog[newView]}] votes so far.`);
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
        logger.log(`[${this.publicKey}], logPrepare, block logged. [${this.prepareLog[blockHash]}] votes so far.`);
    }
}