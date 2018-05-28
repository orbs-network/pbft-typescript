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
    private CB: Block;
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
        this.gossip.subscribe("preprepare", (senderId, payload) => this.onReceivePrePrepare(senderId, payload));
        this.gossip.subscribe("prepare", (senderId, payload) => this.onReceivePrepare(senderId, payload));
        this.gossip.subscribe("view-change", (senderId, payload) => this.onReceiveViewChange(senderId, payload));
    }

    public registerToOnNewBlock(bc: (block: Block) => void): void {
        this.onNewBlockListeners.push(bc);
    }

    public suggestBlockAsLeader(block: Block): void {
        this.CB = block;
        this.pbftStorage.storePrePrepare(this.CB.hash);
        this.broadcastPrePrepare(block);
    }

    public dispose(): any {
        this.electionTrigger.stop();
        this.onNewBlockListeners = [];
    }

    public leaderId(): string {
        return this.network.getNodeIdBySeed(this.currentView);
    }

    private onLeaderChange(): void {
        this.currentView++;
        this.logger.log(`[${this.id}] onLeaderChange, new view:${this.currentView}`);
        const payload: ViewChangePayload = { newView: this.currentView };
        this.gossip.unicast(this.id, this.leaderId(), "view-change", payload);
    }

    private broadcastPrePrepare(block: Block): void {
        this.logger.log(`[${this.id}] broadcastPrePrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PrePreparePayload = {
            block,
            view: this.currentView
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(block: Block): void {
        this.logger.log(`[${this.id}] broadcastPrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PreparePayload = {
            blockHash: block.hash,
            view: this.currentView
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "prepare", payload);
    }

    private async onReceivePrePrepare(senderId: string, payload: PrePreparePayload): Promise<void> {
        this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, blockHash:${payload.block.hash}, view:${payload.view}`);
        if (senderId === this.id) {
            this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, block rejected because it came from this node`);
            return;
        }

        if (this.isFromCurrentLeader(senderId) === false) {
            this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, block rejected because it was not sent by the current leader (${this.currentView})`);
            return;
        }

        if (this.isBlockPointingToPreviousBlock(payload.block) === false) {
            this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, block rejected because it's not pointing to the previous block`);
            return;
        }

        const isValidBlock = await this.blockValidator.validateBlock(payload.block);
        if (!isValidBlock) {
            this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, block is invalid`);
            return;
        }

        if (this.isPrePrepared(payload.block.hash)) {
            this.logger.log(`[${this.id}] onReceivePrePrepare from ${senderId}, already prepared`);
            return;
        }

        this.CB = payload.block;
        const preparePayload: PreparePayload = {
            blockHash: payload.block.hash,
            view: payload.view
        };
        this.pbftStorage.storePrepare(preparePayload.blockHash, senderId);
        this.pbftStorage.storePrePrepare(preparePayload.blockHash);
        this.broadcastPrepare(payload.block);
        this.checkPrepared(payload.block.hash);
    }

    private onReceivePrepare(senderId: string, payload: PreparePayload): void {
        this.logger.log(`[${this.id}] onReceivePrepare from ${senderId}, blockHash:${payload.blockHash}, view:${payload.view}`);
        if (senderId === this.id) {
            this.logger.log(`[${this.id}] onReceivePrepare from ${senderId}, block rejected because it came from this node`);
            return;
        }

        this.pbftStorage.storePrepare(payload.blockHash, senderId);

        this.checkPrepared(payload.blockHash);
    }

    private onReceiveViewChange(senderId: string, payload: ViewChangePayload): void {
        this.logger.log(`[${this.id}] onReceiveViewChange from ${senderId}, newView:${payload.newView}`);
        this.pbftStorage.storeViewChange(payload.newView, senderId);
        if (this.isElected(payload.newView)) {
            const newViewPayload: NewViewPayload = { view: payload.newView };
            this.gossip.multicast(this.id, this.getOtherNodesIds(), "new-view", newViewPayload);
        }
    }

    private checkPrepared(blockHash: string) {
        if (this.isPrePrepared(blockHash) && this.isPrepared(blockHash)) {
            this.logger.log(`[${this.id}] checkPrepared, found enough votes, there's consensus. commtting block (${blockHash})`);
            this.commitBlock(blockHash);
        }
    }

    private getF(): number {
        return Math.floor((this.network.getNodesCount() - 1) / 3);
    }

    private getOtherNodesIds(): string[] {
        return this.network.getAllNodesIds().filter(id => id !== this.id);
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

    private isElected(view: number): boolean {
        return this.pbftStorage.countOfViewChange(view) >= this.getF() * 2 + 1;
    }

    private isPrepared(blockHash: string): boolean {
        return this.pbftStorage.countOfPrepared(blockHash) >= this.getF() * 2;
    }

    private isPrePrepared(blockHash: string): boolean {
        return this.pbftStorage.hasPrePrepare(blockHash);
    }

    private commitBlock(blockHash: string): void {
        if (this.committedBlocksHashs.indexOf(blockHash) === -1) {
            this.electionTrigger.snooze();
            this.committedBlocksHashs.push(blockHash);
            this.onNewBlockListeners.forEach(cb => cb(this.CB));
        }
    }
}