import { Block } from "./Block";
import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./networkCommunication/Payload";
import { PBFTStorage } from "./storage/PBFTStorage";
import { ViewState } from "./ViewState";

export type onNewBlockCB = (block: Block) => void;

export interface TermConfig {
    electionTriggerFactory: ElectionTriggerFactory;
    networkCommunication: NetworkCommunication;
    pbftStorage: PBFTStorage;
    keyManager: KeyManager;
    logger: Logger;
    blockUtils: BlockUtils;
}

export class PBFTTerm {
    private readonly electionTriggerFactory: ElectionTriggerFactory;
    private readonly networkCommunication: NetworkCommunication;
    private readonly blockUtils: BlockUtils;
    private readonly pbftStorage: PBFTStorage;
    private readonly keyManager: KeyManager;
    private readonly logger: Logger;

    private view: number;
    private electedOnView: number;
    private viewState: ViewState;
    private CB: Block;
    private disposed: boolean = false;
    private committedLocally: boolean = false;


    constructor(config: TermConfig, private readonly term: number, private onCommittedBlock: (block: Block) => void) {
        // config
        this.keyManager = config.keyManager;
        this.networkCommunication = config.networkCommunication;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTriggerFactory = config.electionTriggerFactory;
        this.blockUtils = config.blockUtils;

        this.view = 0;
        this.startTerm();
    }

    public async startTerm(): Promise<void> {
        this.initView(0);
        if (this.isLeader()) {
            this.CB = await this.blockUtils.requestNewBlock(this.term);
            if (this.disposed) {
                return;
            }

            this.pbftStorage.storePrePrepare(this.term, this.view, this.CB);
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

    public leaderPk(): string {
        return this.calcLeaderPk(this.view);
    }

    private calcLeaderPk(view: number): string {
        const membersPks = this.networkCommunication.getMembersPKs(view);
        const index = view % membersPks.length;
        return membersPks[index];
    }

    private onLeaderChange(): void {
        this.initView(this.view + 1);
        this.logger.log({ Subject: "Flow", FlowType: "LeaderChange", leaderPk: this.leaderPk(), term: this.term, newView: this.view });
        const payload: ViewChangePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                term: this.term,
                newView: this.view
            }
        };
        this.pbftStorage.storeViewChange(this.term, this.view, this.keyManager.getMyPublicKey());
        if (this.isLeader()) {
            this.checkElected(this.term, this.view);
        } else {
            this.networkCommunication.sendToMembers([this.leaderPk()], "view-change", payload);
        }
    }

    private broadcastPrePrepare(term: number, view: number, block: Block): void {
        const payload: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                block,
                view,
                term
            }
        };
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(term: number, view: number, block: Block): void {
        const payload: PreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                blockHash: block.header.hash,
                view,
                term
            }
        };
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "prepare", payload);
    }

    public async onReceivePrePrepare(payload: PrePreparePayload): Promise<void> {
        if (await this.validatePrePreapare(payload)) {
            this.processPrePrepare(payload);
        }
    }

    private processPrePrepare(payload: PrePreparePayload): void {
        const { view, term, block } = payload.data;
        if (this.view !== view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], processPrePrepare, view doesn't match` });
            return;
        }

        this.CB = block;
        this.pbftStorage.storePrepare(term, view, block.header.hash, this.keyManager.getMyPublicKey());
        this.pbftStorage.storePrePrepare(term, view, block);
        this.broadcastPrepare(term, view, block);
        this.checkPrepared(term, view, block.header.hash);
    }

    private async validatePrePreapare(payload: PrePreparePayload): Promise<boolean> {
        const { data, pk: senderPk } = payload;
        const { view, term, block } = data;

        if (this.checkPrePrepare(term, view)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", already prepared` });
            return false;
        }

        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it was not sent by the current leader (${view})` });
            return false;
        }

        const isValidBlock = await this.blockUtils.validateBlock(block);
        if (this.disposed) {
            return false;
        }

        if (!isValidBlock) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block is invalid` });
            return false;
        }

        return true;
    }

    private checkPrePrepare(term: number, view: number): boolean {
        return this.pbftStorage.getPrePrepare(term, view) !== undefined;
    }

    public onReceivePrepare(payload: PreparePayload): void {
        const { pk: senderPk, data } = payload;
        const { term, view, blockHash } = data;
        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderPk}", prepare not logged because of unrelated view` });
            return;
        }

        if (this.leaderPk() === senderPk) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${senderPk}", prepare not logged as we don't accept prepare from the leader` });
            return;
        }

        this.pbftStorage.storePrepare(term, view, blockHash, senderPk);

        if (this.view === view) {
            this.checkPrepared(term, view, blockHash);
        }
    }

    public onReceiveViewChange(payload: ViewChangePayload): void {
        const { pk: senderPk, data } = payload;
        const { newView, term } = data;
        if (this.view > newView) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because of unrelated view` });
            return;
        }

        const leaderToBePk = this.calcLeaderPk(newView);
        if (leaderToBePk !== this.keyManager.getMyPublicKey()) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], newView:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the newView doesn't match me as the leader` });
            return;
        }

        this.pbftStorage.storeViewChange(term, newView, senderPk);
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
        const block: Block = await this.blockUtils.requestNewBlock(this.term);
        if (this.disposed) {
            return;
        }

        const PP: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                term: this.term,
                view,
                block
            }
        };
        this.CB = block;
        this.logger.log({ Subject: "Flow", FlowType: "Elected", term: this.term, view, blockHash: block.header.hash });
        const newViewPayload: NewViewPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                term: this.term,
                view,
                PP
            }
        };
        this.pbftStorage.storePrePrepare(this.term, this.view, block);
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "new-view", newViewPayload);
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
        this.pbftStorage.storeCommit(term, view, blockHash, this.keyManager.getMyPublicKey());
        const payload: CommitPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: "signature",
            data: {
                term,
                view,
                blockHash
            }
        };
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "commit", payload);
        this.checkCommit(term, view, blockHash);
    }

    public onReceiveCommit(payload: CommitPayload): void {
        const { pk: senderPk, data } = payload;
        const { term, view, blockHash } = data;
        this.pbftStorage.storeCommit(term, view, blockHash, senderPk);

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

    public async onReceiveNewView(payload: NewViewPayload): Promise<void> {
        const { pk: senderPk, data } = payload;
        const { PP, view, term } = data;
        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view is from the past` });
            return;
        }

        if (view !== PP.data.view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view doesn't match PP.view` });
            return;
        }

        if (await this.validatePrePreapare(PP)) {
            this.initView(view);
            this.processPrePrepare(PP);
        }
    }

    private getF(): number {
        return Math.floor((this.networkCommunication.getMembersPKs(this.view).length - 1) / 3);
    }

    private getOtherNodesIds(): string[] {
        return this.networkCommunication.getMembersPKs(this.view).filter(pk => pk !== this.keyManager.getMyPublicKey());
    }

    public isLeader(): boolean {
        return this.leaderPk() === this.keyManager.getMyPublicKey();
    }

    private countElected(term: number, view: number): number {
        return this.pbftStorage.countOfViewChange(term, view);
    }

    private countPrepared(term: number, view: number, blockHash: string): number {
        return this.pbftStorage.getPrepare(term, view, blockHash).length;
    }

    private isPrePrepared(term: number, view: number, blockHash: string): boolean {
        const prePreparedBlock: Block = this.pbftStorage.getPrePrepare(term, view);
        return prePreparedBlock && (prePreparedBlock.header.hash === blockHash);
    }

    private commitBlock(block: Block): void {
        if (this.committedLocally) {
            return;
        }
        this.committedLocally = true;
        this.logger.log({ Subject: "Flow", FlowType: "Commit", term: this.term, view: this.view, block });
        this.stopViewState();
        this.onCommittedBlock(this.CB);
    }
}