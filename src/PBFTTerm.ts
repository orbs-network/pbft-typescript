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

export class PBFTTerm {
    private readonly network: Network;
    private readonly pbftStorage: PBFTStorage;
    private readonly logger: Logger;
    private view: number;
    private electedOnView: number;
    private viewState: ViewState;
    private CB: Block;
    private disposed: boolean = false;

    public readonly id: string;
    public readonly blocksValidator: BlocksValidator;
    public readonly blocksProvider: BlocksProvider;
    public readonly electionTriggerFactory: ElectionTriggerFactory;
    public readonly gossip: Gossip;

    constructor(config: Config, private readonly term: number, private onCommittedBlock: (block: Block) => void) {
        // config
        this.id = config.id;
        this.network = config.network;
        this.gossip = config.gossip;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTriggerFactory = config.electionTriggerFactory;
        this.blocksValidator = config.blocksValidator;
        this.blocksProvider = config.blocksProvider;

        this.view = 0;
        this.startTerm();
    }

    public async startTerm(): Promise<void> {
        this.initView(0);
        if (this.isLeader(this.id)) {
            this.CB = await this.blocksProvider.getBlock();
            if (this.disposed) {
                return;
            }

            this.pbftStorage.storePrePrepare(this.term, this.view, this.CB.hash, this.CB.content);
            this.broadcastPrePrepare(this.term, this.view, this.CB);
        }
    }

    public getView(): number {
        return this.view;
    }

    private initView(view: number) {
        this.electedOnView = -1;
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

    public dispose(): void {
        this.disposed = true;
        this.stopViewState();
    }

    public leaderId(): string {
        return this.network.getNodeIdBySeed(this.view);
    }

    private onLeaderChange(): void {
        this.initView(this.view + 1);
        this.logger.log({ Subject: "Flow", FlowType: "LeaderChange", leaderId: this.leaderId(), term: this.term, newView: this.view });
        const payload: ViewChangePayload = { term: this.term, newView: this.view };
        this.pbftStorage.storeViewChange(this.term, this.view, this.id);
        if (this.isLeader(this.id)) {
            this.checkElected(this.term, this.view);
        } else {
            this.gossip.unicast(this.id, this.leaderId(), "view-change", payload);
        }
    }

    private broadcastPrePrepare(term: number, view: number, block: Block): void {
        const payload: PrePreparePayload = {
            block,
            view,
            term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(term: number, view: number, block: Block): void {
        const payload: PreparePayload = {
            blockHash: block.hash,
            view,
            term
        };
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "prepare", payload);
    }

    public async onReceivePrePrepare(senderId: string, payload: PrePreparePayload): Promise<void> {
        const { view, term, block } = payload;

        if (this.view !== view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", unrelated view` });
            return;
        }

        if (this.checkPrePrepare(term, view)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", already prepared` });
            return;
        }

        if (this.isLeader(senderId) === false) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block rejected because it was not sent by the current leader (${view})` });
            return;
        }

        const isValidBlock = await this.blocksValidator.validateBlock(block);
        if (this.disposed) {
            return;
        }

        if (!isValidBlock) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block is invalid` });
            return;
        }

        this.CB = block;
        this.pbftStorage.storePrepare(term, view, block.hash, this.id);
        this.pbftStorage.storePrePrepare(term, view, block.hash, block.content);
        this.broadcastPrepare(term, view, block);
        this.checkPrepared(term, view, block.hash);
    }

    private checkPrePrepare(term: number, view: number): boolean {
        return this.pbftStorage.getPrePrepare(term, view) !== undefined;
    }

    public onReceivePrepare(senderId: string, payload: PreparePayload): void {
        const { term, view, blockHash } = payload;
        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderId}", prepare not logged because of unrelated view` });
            return;
        }

        if (this.isLeader(senderId)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderId}", prepare not logged as we don't accept prepare from the leader` });
            return;
        }

        this.pbftStorage.storePrepare(term, view, blockHash, senderId);

        if (this.view === view) {
            this.checkPrepared(term, view, blockHash);
        }
    }

    public onReceiveViewChange(senderId: string, payload: ViewChangePayload): void {
        const { newView, term } = payload;
        const leaderToBeId = this.network.getNodeIdBySeed(newView);
        if (leaderToBeId !== this.id) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], newView:[${newView}], onReceiveViewChange from "${senderId}", ignored because the newView doesn't match me as the leader` });
            return;
        }

        if (this.view > newView) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderId}", ignored because of unrelated view` });
            return;
        }

        this.pbftStorage.storeViewChange(term, newView, senderId);
        this.checkElected(term, newView);
    }

    private checkElected(term: number, view: number): void {
        const countElected = this.countElected(term, view);
        if (countElected >= this.getF() * 2 + 1) {
            this.onElected(view);
        }
    }

    private async onElected(view: number) {
        if (this.electedOnView === view) {
            return;
        }
        this.initView(view);
        this.electedOnView = view;
        const block: Block = await this.blocksProvider.getBlock();
        if (this.disposed) {
            return;
        }

        const PP: PrePreparePayload = {
            term: this.term,
            view,
            block
        };
        this.CB = block;
        this.logger.log({ Subject: "Flow", FlowType: "Elected", term: this.term, view, blockHash: block.hash });
        const newViewPayload: NewViewPayload = { term: this.term, view, PP };
        this.pbftStorage.storePrePrepare(this.term, this.view, block.hash, block.content);
        this.gossip.multicast(this.id, this.getOtherNodesIds(), "new-view", newViewPayload);
    }

    private checkPrepared(term: number, view: number, blockHash: string) {
        if (this.isPrePrepared(term, view, blockHash)) {
            const countPrepared = this.countPrepared(term, view, blockHash);
            if (countPrepared >= this.getF() * 2) {
                this.onPrepared(term, view, blockHash);
            }
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

    public onReceiveCommit(senderId: string, payload: CommitPayload): void {
        const { term, view, blockHash } = payload;
        this.pbftStorage.storeCommit(term, view, blockHash, senderId);

        this.checkCommit(term, view, blockHash);
    }

    private checkCommit(term: number, view: number, blockHash: string): void {
        if (this.isPrePrepared(term, view, blockHash)) {
            const commits = this.pbftStorage.getCommit(term, view, blockHash).length;
            if (commits >= this.getF() * 2 + 1) {
                this.commitBlock(this.CB);
            }
        }
    }

    public onReceiveNewView(senderId: string, payload: NewViewPayload): void {
        const { PP, view, term } = payload;
        const wanaBeLeaderId = this.network.getNodeIdBySeed(view);
        if (wanaBeLeaderId !== senderId) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderId}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderId}", view is from the past` });
            return;
        }

        this.initView(view);
        this.onReceivePrePrepare(senderId, PP);
    }

    private getF(): number {
        return Math.floor((this.network.getNodesCount() - 1) / 3);
    }

    private getOtherNodesIds(): string[] {
        return this.network.getAllNodesIds().filter(id => id !== this.id);
    }

    private isLeader(senderId: string): boolean {
        return this.leaderId() === senderId;
    }

    private countElected(term: number, view: number): number {
        return this.pbftStorage.countOfViewChange(term, view);
    }

    private countPrepared(term: number, view: number, blockHash: string): number {
        return this.pbftStorage.getPrepare(term, view, blockHash).length;
    }

    private isPrePrepared(term: number, view: number, blockHash: string): boolean {
        const prePreparedBlockHash = this.pbftStorage.getPrePrepare(term, view);
        return prePreparedBlockHash === blockHash;
    }

    private commitBlock(block: Block): void {
        this.logger.log({ Subject: "Flow", FlowType: "Commit", term: this.term, view: this.view, blockHash: block.hash, blockContent: block.content });
        this.stopViewState();
        this.onCommittedBlock(this.CB);
    }
}