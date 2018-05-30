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
    private term: number;

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

        // init term
        this.term = 0;

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
        this.pbftStorage.storePrePrepare(this.term, block.hash);
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
        this.logger.log(`onLeaderChange, new view:${this.currentView}`);
        const payload: ViewChangePayload = { newView: this.currentView };
        this.gossip.unicast(this.id, this.leaderId(), "view-change", payload);
    }

    private broadcastPrePrepare(block: Block): void {
        this.logger.log(`broadcastPrePrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PrePreparePayload = {
            block,
            view: this.currentView,
            term: this.term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(block: Block): void {
        this.logger.log(`broadcastPrepare blockHash:${block.hash}, view:${this.currentView}`);
        const payload: PreparePayload = {
            blockHash: block.hash,
            view: this.currentView,
            term: this.term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "prepare", payload);
    }

    private async onReceivePrePrepare(senderId: string, payload: PrePreparePayload): Promise<void> {
        const { view, term, block } = payload;
        this.logger.log(`onReceivePrePrepare from ${senderId}, blockHash:${block.hash}, view:${view}`);
        if (senderId === this.id) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, block rejected because it came from this node`);
            return;
        }

        if (this.term !== term) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, unrelated term ${this.term}`);
            return;
        }

        if (this.isFromCurrentLeader(senderId) === false) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, block rejected because it was not sent by the current leader (${this.currentView})`);
            return;
        }

        if (this.isBlockPointingToPreviousBlock(block) === false) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, block rejected because it's not pointing to the previous block`);
            return;
        }

        if (this.isPrePrepared(term, block.hash)) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, already prepared`);
            return;
        }

        const isValidBlock = await this.blockValidator.validateBlock(block);
        if (!isValidBlock) {
            this.logger.log(`onReceivePrePrepare from ${senderId}, block is invalid`);
            return;
        }

        this.CB = block;
        const preparePayload: PreparePayload = {
            blockHash: block.hash,
            view: view,
            term: term
        };
        this.pbftStorage.storePrepare(term, this.id, block.hash);
        this.pbftStorage.storePrePrepare(term, block.hash);
        this.broadcastPrepare(payload.block);
        this.checkPrepared(term, block.hash);
    }

    private onReceivePrepare(senderId: string, payload: PreparePayload): void {
        const { term, view, blockHash } = payload;
        this.logger.log(`onReceivePrepare from ${senderId}, blockHash:${blockHash}, view:${view}`);
        if (senderId === this.id) {
            this.logger.log(`onReceivePrepare from ${senderId}, block rejected because it came from this node`);
            return;
        }

        if (this.isFromCurrentLeader(senderId)) {
            this.logger.log(`onReceivePrepare from ${senderId}, prepare not logged as we don't accept prepare from the leader`);
            return;
        }

        this.pbftStorage.storePrepare(term, senderId, blockHash);

        this.checkPrepared(term, blockHash);
    }

    private onReceiveViewChange(senderId: string, payload: ViewChangePayload): void {
        this.logger.log(`onReceiveViewChange from ${senderId}, newView:${payload.newView}`);
        this.pbftStorage.storeViewChange(payload.newView, senderId);
        if (this.isElected(payload.newView)) {
            const newViewPayload: NewViewPayload = { view: payload.newView };
            this.gossip.multicast(this.id, this.getOtherNodesIds(), "new-view", newViewPayload);
        }
    }

    private checkPrepared(term: number, blockHash: string) {
        if (this.isPrePrepared(term, blockHash)) {
            if (this.isPrepared(term, blockHash)) {
                this.logger.log(`checkPrepared, we have CONSENSUS. on term ${term}`);
                this.commitBlock(this.CB);
            } else {
                this.logger.log(`checkPrepared, not enough votes for term ${term}`);
            }
        } else {
            this.logger.log(`checkPrepared, not preprepared on term ${term}`);
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

    private isPrepared(term: number, blockHash: string): boolean {
        return this.pbftStorage.getPrepare(term).filter(i => i.blockHash === blockHash).length >= this.getF() * 2;
    }

    private isPrePrepared(term: number, blockHash: string): boolean {
        const prePreparedBlockHash = this.pbftStorage.getPrePrepare(term);
        return prePreparedBlockHash === blockHash;
    }

    private commitBlock(block: Block): void {
        if (this.committedBlocksHashs.indexOf(block.hash) === -1) {
            this.electionTrigger.snooze();
            this.committedBlocksHashs.push(block.hash);
            this.onNewBlockListeners.forEach(cb => cb(this.CB));
            this.term++;
        }
    }
}