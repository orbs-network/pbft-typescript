import { Block } from "./Block";
import { Config } from "./Config";
import { BlockValidator } from "./blockValidator/BlockValidator";
import { ElectionTrigger } from "./electionTrigger/ElectionTrigger";
import { Gossip } from "./gossip/Gossip";
import { NewViewPayload, PrePreparePayload, PreparePayload, ViewChangePayload } from "./gossip/Payload";
import { Logger } from "./logger/Logger";
import { Network } from "./network/Network";
import { PBFTStorage } from "./storage/PBFTStorage";

export type onNewBlockCB = (block: Block) => void;

export class PBFT {
    private committedBlocksHashs: string[];
    private prePrepareBlock: Block;
    private currentView: number = 0;
    private network: Network;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private electionTrigger: ElectionTrigger;
    private onNewBlockListeners: onNewBlockCB[];

    public id: string;
    public blockValidator: BlockValidator;
    public gossip: Gossip;

    constructor(config: Config) {
        config.logger.log(`PBFT instace initiating`);

        this.onNewBlockListeners = [];

        // config
        this.id = config.id;
        this.network = config.network;
        this.gossip = config.gossip;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTrigger = config.electionTrigger;
        this.blockValidator = config.blockValidator;

        // leader election
        this.electionTrigger.register(() => this.onLeaderChange());
        this.electionTrigger.start();

        // init committedBlocks
        this.committedBlocksHashs = [config.genesisBlockHash];

        // gossip subscriptions
        this.gossip.subscribe("preprepare", (senderId, payload) => this.onPrePrepare(senderId, payload));
        this.gossip.subscribe("prepare", (senderId, payload) => this.onPrepare(senderId, payload));
        this.gossip.subscribe("view-change", (senderId, payload) => this.onViewChange(senderId, payload));
    }

    public registerToOnNewBlock(bc: (block: Block) => void): void {
        this.onNewBlockListeners.push(bc);
    }

    public suggestBlockAsLeader(block: Block): void {
        this.prePrepareBlock = block;
        this.broadcastPrePrepare(block);
    }

    public dispose(): any {
        this.electionTrigger.stop();
        this.onNewBlockListeners = [];
    }

    public leaderId(): string {
        return this.network.getNodeIdBySeed(this.currentView);
    }

    private getF(): number {
        return Math.floor((this.network.getNodesCount() - 1) / 3);
    }

    private onLeaderChange(): void {
        this.currentView++;
        this.logger.log(`onLeaderChange, new view:${this.currentView}`);
        const payload: ViewChangePayload = { newView: this.currentView };
        this.gossip.unicast(this.id, this.leaderId(), "view-change", payload);
    }

    private broadcastPrePrepare(block: Block): void {
        this.logger.log(`broadcastPrePrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PrePreparePayload = {
            block,
            view: this.currentView
        };
        this.gossip.broadcast(this.id, "preprepare", payload);
    }

    private broadcastPrepare(block: Block): void {
        this.logger.log(`broadcastPrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PreparePayload = {
            blockHash: block.hash,
            view: this.currentView
        };
        this.gossip.broadcast(this.id, "prepare", payload);
    }

    private async onPrePrepare(senderId: string, payload: PrePreparePayload): Promise<void> {
        this.logger.log(`onPrePrepare blockHash:${payload.block.hash}, view:${payload.view}`);
        if (this.isBlockPointingToPreviousBlock(payload.block)) {
            if (this.isFromCurrentLeader(senderId)) {
                const isValidBlock = await this.blockValidator.validateBlock(payload.block);
                if (!isValidBlock) {
                    this.logger.log(`onPrePrepare, block is invalid`);
                    return;
                }
                this.prePrepareBlock = payload.block;
                const preparePayload: PreparePayload = {
                    blockHash: payload.block.hash,
                    view: payload.view
                };
                this.pbftStorage.storePrepare(preparePayload.blockHash, senderId);
                this.broadcastPrepare(payload.block);
                if (this.isPrepared(payload.block.hash)) {
                    this.logger.log(`onPrePrepare, found enough votes, there's consensus. commtting block (${this.prePrepareBlock.hash})`);
                    this.commitBlock(this.prePrepareBlock);
                }
            } else {
                this.logger.log(`onPrePrepare, block rejected because it was not sent by the current leader (${this.currentView})`);
            }
        } else {
            this.logger.log(`onPrePrepare, block rejected because it's not pointing to the previous block`);
        }
    }

    private onPrepare(senderId: string, payload: PreparePayload): void {
        this.logger.log(`onPrepare blockHash:${payload.blockHash}, view:${payload.view}`);
        this.pbftStorage.storePrepare(payload.blockHash, senderId);
        if (this.isBlockMatchPrePrepareBlock(payload.blockHash)) {
            if (this.isPrepared(payload.blockHash)) {
                this.logger.log(`onPrepare, found enough votes, there's consensus. commtting block (${this.prePrepareBlock.hash})`);
                this.commitBlock(this.prePrepareBlock);
            }
        } else {
            this.logger.log(`onPrepare, block rejected because it does not match the onPrePare block`);
        }
    }

    private onViewChange(senderId: string, payload: ViewChangePayload): void {
        this.logger.log(`onViewChange, newView:${payload.newView}`);
        this.pbftStorage.storeViewChange(payload.newView, senderId);
        if (this.isElected(payload.newView)) {
            const newViewPayload: NewViewPayload = { view: payload.newView };
            this.gossip.broadcast(this.id, "new-view", newViewPayload);
        }
    }

    private getLatestConfirmedBlockHash(): string {
        return this.committedBlocksHashs[this.committedBlocksHashs.length - 1];
    }

    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private isFromCurrentLeader(senderId: string): boolean {
        return this.leaderId() === senderId;
    }

    private isBlockMatchPrePrepareBlock(blockHash: string): boolean {
        return this.prePrepareBlock !== undefined && this.prePrepareBlock.hash === blockHash;
    }

    private isElected(view: number): boolean {
        return this.pbftStorage.countOfViewChange(view) >= this.getF() * 2 + 1;
    }

    private isPrepared(blockHash: string): boolean {
        return this.pbftStorage.countOfPrepared(blockHash) >= this.getF() * 2;
    }

    private commitBlock(block: Block): void {
        this.electionTrigger.snooze();
        const blockHash = block.hash;
        if (this.committedBlocksHashs.indexOf(blockHash) === -1) {
            this.committedBlocksHashs.push(blockHash);
            this.onNewBlockListeners.forEach(cb => cb(block));
        }
    }
}