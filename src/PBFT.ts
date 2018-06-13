import { Block } from "./Block";
import { BlocksProvider } from "./blocksProvider/BlocksProvider";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { Gossip } from "./gossip/Gossip";
import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./gossip/Payload";
import { Logger } from "./logger/Logger";
import { Network } from "./network/Network";
import { PBFTStorage } from "./storage/PBFTStorage";
import { ViewState } from "./ViewState";

export type onNewBlockCB = (block: Block) => void;

export class PBFT {
    private committedBlocksHashs: string[];
    private CB: Block;
    private network: Network;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private onNewBlockListeners: onNewBlockCB[];
    private view: number;
    private term: number;
    private viewState: ViewState;

    public id: string;
    public blocksValidator: BlocksValidator;
    public blocksProvider: BlocksProvider;
    public electionTriggerFactory: ElectionTriggerFactory;
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
        this.electionTriggerFactory = config.electionTriggerFactory;
        this.blocksValidator = config.blocksValidator;
        this.blocksProvider = config.blocksProvider;

        // init committedBlocks
        this.committedBlocksHashs = [config.genesisBlockHash];

        this.initPBFT();
        this.subscriveToGossip();
    }

    private subscriveToGossip(): void {
        this.gossip.subscribe("preprepare", (senderId, payload) => this.onReceivePrePrepare(senderId, payload));
        this.gossip.subscribe("prepare", (senderId, payload) => this.onReceivePrepare(senderId, payload));
        this.gossip.subscribe("commit", (senderId, payload) => this.onReceiveCommit(senderId, payload));
        this.gossip.subscribe("view-change", (senderId, payload) => this.onReceiveViewChange(senderId, payload));
        this.gossip.subscribe("new-view", (senderId, payload) => this.onReceiveNewView(senderId, payload));
    }

    private initPBFT(): void {
        this.term = 0; // TODO: this.lastCommittedBlock.height;
        this.view = 0;
    }

    private initView(view: number) {
        this.view = view;
        this.CB = undefined;
        this.startViewState(this.view);
    }

    private stopViewState(): void {
        if (this.viewState) {
            this.viewState.dispose();
            this.viewState = undefined;
        }
    }

    private startViewState(view: number) {
        if (this.viewState && this.viewState.view !== view) {
            this.stopViewState();
        }
        if (!this.viewState) {
            this.viewState = new ViewState(this.electionTriggerFactory, view, () => this.onLeaderChange());
        }
    }

    public registerToOnNewBlock(bc: (block: Block) => void): void {
        this.onNewBlockListeners.push(bc);
    }

    public processNextBlock(): void {
        this.initView(0);
        if (this.isLeader(this.id)) {
            this.CB = this.blocksProvider.getBlock();
            this.pbftStorage.storePrePrepare(this.term, this.view, this.CB.hash);
            this.broadcastPrePrepare(this.term, this.view, this.CB);
        }
    }

    public dispose(): any {
        this.stopViewState();
        this.onNewBlockListeners = [];
    }

    public leaderId(): string {
        return this.network.getNodeIdBySeed(this.view);
    }

    private onLeaderChange(): void {
        this.view++;
        this.logger.log(`term:[${this.term}], view:[${this.view}], onLeaderChange`);
        const payload: ViewChangePayload = { newView: this.view };
        this.pbftStorage.storeViewChange(this.view, this.id);
        if (this.isLeader(this.id)) {
            this.checkElected(this.view);
        } else {
            this.gossip.unicast(this.id, this.leaderId(), "view-change", payload);
        }
        this.startViewState(this.view);
        this.logger.cycle();
    }

    private broadcastPrePrepare(term: number, view: number, block: Block): void {
        this.logger.log(`term:[${this.term}], view:[${this.view}], broadcastPrePrepare blockHash:${block.hash}`);
        const payload: PrePreparePayload = {
            block,
            view,
            term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(term: number, view: number, block: Block): void {
        this.logger.log(`term:[${term}], view:[${view}], broadcastPrepare blockHash:${block.hash}`);
        const payload: PreparePayload = {
            blockHash: block.hash,
            view,
            term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "prepare", payload);
    }

    private async onReceivePrePrepare(senderId: string, payload: PrePreparePayload): Promise<void> {
        const { view, term, block } = payload;
        this.logger.log(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", blockHash:${block.hash}`);
        if (senderId === this.id) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block rejected because it came from this node`);
            return;
        }

        if (this.isLeader(senderId) === false) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block rejected because it was not sent by the current leader (${view})`);
            return;
        }

        if (this.isBlockPointingToPreviousBlock(block) === false) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block rejected because it's not pointing to the previous block`);
            return;
        }

        const isValidBlock = await this.blocksValidator.validateBlock(block);
        if (!isValidBlock) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block is invalid`);
            return;
        }

        if (this.view !== view) {
            return;
        }

        if (this.term !== term) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", unrelated term ${term}`);
            return;
        }

        if (this.checkPrePrepare(term, view)) {
            this.logger.logC(`term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", already prepared`);
            return;
        }

        this.CB = block;
        this.pbftStorage.storePrepare(term, view, block.hash, this.id);
        this.pbftStorage.storePrePrepare(term, view, block.hash);
        this.broadcastPrepare(term, view, block);
        this.checkPrepared(term, view, block.hash);
        this.logger.cycle();
    }

    private checkPrePrepare(term: number, view: number): boolean {
        return this.pbftStorage.getPrePrepare(term, view) !== undefined;
    }

    private onReceivePrepare(senderId: string, payload: PreparePayload): void {
        const { term, view, blockHash } = payload;
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderId}"`);
        if (senderId === this.id) {
            this.logger.logC(`term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderId}", block rejected because it came from this node`);
            return;
        }

        if (this.view !== view) {
            return;
        }

        if (this.isLeader(senderId)) {
            this.logger.logC(`term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderId}", prepare not logged as we don't accept prepare from the leader`);
            return;
        }

        this.pbftStorage.storePrepare(term, view, blockHash, senderId);

        this.checkPrepared(term, view, blockHash);
        this.logger.cycle();
    }

    private onReceiveViewChange(senderId: string, payload: ViewChangePayload): void {
        this.logger.log(`term:[${this.term}], view:[${this.view}], onReceiveViewChange from "${senderId}", newView:${payload.newView}`);
        this.pbftStorage.storeViewChange(payload.newView, senderId);
        const view = payload.newView;
        this.checkElected(view);
        this.logger.cycle();
    }

    private checkElected(view: number): void {
        const countElected = this.countElected(view);
        if (countElected >= this.getF() * 2 + 1) {
            this.logger.log(`term:[${this.term}], view:[${view}], checkElected, elected! ${countElected} >= ${this.getF()} * 2 + 1`);
            this.onElected(view);
        } else {
            this.logger.log(`term:[${this.term}], view:[${view}], checkElected, not elected yet. ${countElected} < ${this.getF()} * 2 + 1`);
        }
    }

    private onElected(view: number) {
        this.view = view;
        const block: Block = this.blocksProvider.getBlock();
        this.logger.log(`term:[${this.term}], view:[${view}], blockHash:[${block.hash}], onElected, new block constructed.`);
        const PP: PrePreparePayload = {
            term: this.term,
            view,
            block
        };
        this.CB = block;
        const newViewPayload: NewViewPayload = { PP };
        this.pbftStorage.storePrePrepare(this.term, this.view, block.hash);
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "new-view", newViewPayload);
    }

    private checkPrepared(term: number, view: number, blockHash: string) {
        if (this.isPrePrepared(term, view, blockHash)) {
            const countPrepared = this.countPrepared(term, view, blockHash);
            if (countPrepared >= this.getF() * 2) {
                this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkPrepared, we have CONSENSUS! ${countPrepared} >= ${this.getF()} * 2`);
                this.onPrepared(term, view, blockHash);
            } else {
                this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkPrepared, not enough votes ${countPrepared} < ${this.getF()} * 2`);
            }
        } else {
            this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkPrepared, not preprepared`);
        }
    }

    private onPrepared(term: number, view: number, blockHash: string): void {
        this.pbftStorage.storeCommit(term, view, blockHash, this.id);
        const payload = {
            term,
            view,
            blockHash
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "commit", payload);
        this.checkCommit(term, view, blockHash);
    }

    private onReceiveCommit(senderId: string, payload: CommitPayload): void {
        const { term, view, blockHash } = payload;
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceiveCommit from "${senderId}"`);
        this.pbftStorage.storeCommit(term, view, blockHash, senderId);

        this.checkCommit(term, view, blockHash);
        this.logger.cycle();
    }

    private checkCommit(term: number, view: number, blockHash: string): void {
        if (this.isPrePrepared(term, view, blockHash)) {
            const commits = this.pbftStorage.getCommit(term, view, blockHash).length;
            if (commits >= this.getF() * 2 + 1) {
                this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkCommit, we have CONSENSUS! ${commits} >= ${this.getF()} * 2 + 1`);
                this.commitBlock(this.CB);
            } else {
                this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkCommit, not enough commits. ${commits} < ${this.getF()} * 2 + 1`);
            }
        } else {
            this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], checkCommit, not pre-prepared.`);
        }
    }

    private onReceiveNewView(senderId: string, payload: NewViewPayload): void {
        const { PP } = payload;
        const { view } = PP;
        this.logger.log(`term:[${this.term}], view:[${view}], onReceiveNewView from "${senderId}"`);
        this.initView(view);
        this.onReceivePrePrepare(senderId, PP);
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

    private isLeader(senderId: string): boolean {
        return this.leaderId() === senderId;
    }

    private countElected(view: number): number {
        return this.pbftStorage.countOfViewChange(view);
    }

    private countPrepared(term: number, view: number, blockHash: string): number {
        return this.pbftStorage.getPrepare(term, view, blockHash).length;
    }

    private isPrePrepared(term: number, view: number, blockHash: string): boolean {
        const prePreparedBlockHash = this.pbftStorage.getPrePrepare(term, view);
        return prePreparedBlockHash === blockHash;
    }

    private commitBlock(block: Block): void {
        if (this.committedBlocksHashs.indexOf(block.hash) === -1) {
            this.logger.log(`term:[${this.term}], view:[${this.view}], blockHash:[${block.hash}] COMMITTED!`);
            this.committedBlocksHashs.push(block.hash);
            this.stopViewState();
            this.onNewBlockListeners.forEach(cb => cb(this.CB));
            this.term++;
        } else {
            this.logger.log(`term:[${this.term}], view:[${this.view}], blockHash:[${block.hash}] already committed.`);
        }
    }
}