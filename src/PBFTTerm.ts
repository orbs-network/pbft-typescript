import { Block } from "./Block";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./networkCommunication/Payload";
import { PBFTStorage, PreparedProof } from "./storage/PBFTStorage";
import { ViewState } from "./ViewState";
import { BlockUtils } from "./blockUtils/BlockUtils";

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
    private readonly termMembersPKs: string[];

    private view: number;
    private newViewLocally: number = -1;
    private viewState: ViewState;
    private CB: Block;
    private disposed: boolean = false;
    private preparedLocally: boolean = false;
    private committedLocally: boolean = false;


    constructor(config: TermConfig, private readonly term: number, private onCommittedBlock: (block: Block) => void) {
        // config
        this.keyManager = config.keyManager;
        this.networkCommunication = config.networkCommunication;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTriggerFactory = config.electionTriggerFactory;
        this.blockUtils = config.blockUtils;

        this.termMembersPKs = this.networkCommunication.getMembersPKs(term);
        this.view = 0;
        this.startTerm();
    }

    public async startTerm(): Promise<void> {
        this.initView(0);
        if (this.isLeader()) {
            this.CB = await this.blockUtils.requestNewBlock(this.term);
            const metaData = {
                method: "requestNewBlock",
                height: this.term,
                prevBlockHash: this.CB.header.prevBlockHash
            };
            this.logger.log({ Subject: "Info", message: `generated new block`, metaData });
            if (this.disposed) {
                return;
            }

            const payload: PrePreparePayload = this.buildPrePreparePayload(this.term, this.view, this.CB);
            this.pbftStorage.storePrePrepare(this.term, this.view, this.CB, payload);
            this.broadcastPrePrepare(payload);
        }
    }

    public getView(): number {
        return this.view;
    }

    private initView(view: number) {
        this.preparedLocally = false;
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
        this.pbftStorage.clearTermLogs(this.term);
    }

    public leaderPk(): string {
        return this.calcLeaderPk(this.view);
    }

    private calcLeaderPk(view: number): string {
        const index = view % this.termMembersPKs.length;
        return this.termMembersPKs[index];
    }

    private onLeaderChange(): void {
        this.initView(this.view + 1);
        const preparedProof: PreparedProof = this.pbftStorage.getLatestPreparedProof(this.term);
        this.logger.log({ Subject: "Flow", FlowType: "LeaderChange", leaderPk: this.leaderPk(), term: this.term, newView: this.view });
        const data = { term: this.term, newView: this.view, preparedProof };
        const payload: ViewChangePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data
        };
        this.pbftStorage.storeViewChange(this.term, this.view, this.keyManager.getMyPublicKey(), payload);
        if (this.isLeader()) {
            this.checkElected(this.term, this.view);
        } else {
            this.networkCommunication.sendToMembers([this.leaderPk()], "view-change", payload);
        }
    }

    private buildPrePreparePayload(term: number, view: number, block: Block): PrePreparePayload {
        const blockHash: Buffer = this.blockUtils.calculateBlockHash(block);
        const data = { blockHash, view, term };
        const payload: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data,
            block,
        };

        return payload;
    }

    private buildPreparePayload(term: number, view: number, blockHash: Buffer): PreparePayload {
        const data = { blockHash, view, term };
        const payload: PreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data
        };

        return payload;
    }

    private broadcastPrePrepare(payload: PrePreparePayload): void {
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "preprepare", payload);
    }

    private broadcastPrepare(term: number, view: number, block: Block): void {
        const blockHash: Buffer = this.blockUtils.calculateBlockHash(block);
        const data = { blockHash, view, term };
        const payload: PreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data
        };
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "prepare", payload);
    }

    public async onReceivePrePrepare(payload: PrePreparePayload): Promise<void> {
        if (await this.validatePrePreapare(payload)) {
            this.processPrePrepare(payload);
        }
    }

    private processPrePrepare(payload: PrePreparePayload): void {
        const { view, term, blockHash } = payload.data;
        const { block } = payload;
        if (this.view !== view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], processPrePrepare, view doesn't match` });
            return;
        }

        this.CB = block;
        const preparePayoad: PreparePayload = this.buildPreparePayload(term, view, blockHash);
        this.pbftStorage.storePrepare(term, view, blockHash, this.keyManager.getMyPublicKey(), preparePayoad);
        this.pbftStorage.storePrePrepare(term, view, block, payload);
        this.broadcastPrepare(term, view, block);
        this.checkPrepared(term, view, blockHash);
    }

    private async validatePrePreapare(payload: PrePreparePayload): Promise<boolean> {
        const { data, block, pk: senderPk } = payload;
        const { view, term, blockHash } = data;

        if (this.checkPrePrepare(term, view)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", already prepared` });
            return false;
        }

        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it was not sent by the current leader (${view})` });
            return false;
        }

        const givenBlockHash = this.blockUtils.calculateBlockHash(block);
        if (givenBlockHash.equals(blockHash) === false) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it doesn't match the given blockHash (${view})` });
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
        return this.pbftStorage.getPrePrepareBlock(term, view) !== undefined;
    }

    public onReceivePrepare(payload: PreparePayload): void {
        const { pk: senderPk, data } = payload;
        const { term, view, blockHash } = data;
        const metaData = {
            method: "onReceivePrepare",
            term,
            view,
            blockHash,
            senderPk
        };
        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `unrelated view`, metaData });
            return;
        }

        if (this.leaderPk() === senderPk) {
            this.logger.log({ Subject: "Warning", message: `prepare received from leader is forbidden`, metaData });
            return;
        }

        this.pbftStorage.storePrepare(term, view, blockHash, senderPk, payload);

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

        this.pbftStorage.storeViewChange(term, newView, senderPk, payload);
        this.checkElected(term, newView);
    }

    private checkElected(term: number, view: number): void {
        if (this.newViewLocally < view) {
            const countElected = this.countElected(term, view);
            if (countElected >= this.getF() * 2 + 1) {
                this.onElected(view);
            }
        }
    }

    private async onElected(view: number) {
        this.newViewLocally = view;
        this.initView(view);
        const block: Block = await this.blockUtils.requestNewBlock(this.term);
        if (this.disposed) {
            return;
        }

        const blockHash = this.blockUtils.calculateBlockHash(block);
        const dataPP = { term: this.term, view, blockHash };
        const PP: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(dataPP),
            data: dataPP,
            block
        };
        this.CB = block;
        this.logger.log({ Subject: "Flow", FlowType: "Elected", term: this.term, view, blockHash });
        const dataNV = { term: this.term, view, PP };
        const newViewPayload: NewViewPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(dataNV),
            data: dataNV
        };
        this.pbftStorage.storePrePrepare(this.term, this.view, block, PP);
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "new-view", newViewPayload);
    }

    private checkPrepared(term: number, view: number, blockHash: Buffer) {
        if (!this.preparedLocally) {
            if (this.isPrePrepared(term, view, blockHash)) {
                const countPrepared = this.countPrepared(term, view, blockHash);
                const metaData = {
                    method: "checkPrepared",
                    height: this.term,
                    blockHash,
                    countPrepared
                };
                this.logger.log({ Subject: "Info", message: `counting`, metaData });
                if (countPrepared >= this.getF() * 2) {
                    this.onPrepared(term, view, blockHash);
                }
            }
        }
    }

    private onPrepared(term: number, view: number, blockHash: Buffer): void {
        this.preparedLocally = true;
        const data = { term, view, blockHash };
        const payload: CommitPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data
        };
        this.pbftStorage.storeCommit(term, view, blockHash, this.keyManager.getMyPublicKey(), payload);
        this.networkCommunication.sendToMembers(this.getOtherNodesIds(), "commit", payload);
        this.checkCommit(term, view, blockHash);
    }

    public onReceiveCommit(payload: CommitPayload): void {
        const { pk: senderPk, data } = payload;
        const { term, view, blockHash } = data;
        this.pbftStorage.storeCommit(term, view, blockHash, senderPk, payload);

        this.checkCommit(term, view, blockHash);
    }

    private checkCommit(term: number, view: number, blockHash: Buffer): void {
        if (!this.committedLocally) {
            if (this.isPrePrepared(term, view, blockHash)) {
                const commits = this.pbftStorage.getCommitSendersPks(term, view, blockHash).length;
                if (commits >= this.getF() * 2 + 1) {
                    this.commitBlock(this.CB);
                }
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
            this.newViewLocally = view;
            this.initView(view);
            this.processPrePrepare(PP);
        }
    }

    private getF(): number {
        return Math.floor((this.termMembersPKs.length - 1) / 3);
    }

    private getOtherNodesIds(): string[] {
        return this.termMembersPKs.filter(pk => pk !== this.keyManager.getMyPublicKey());
    }

    public isLeader(): boolean {
        return this.leaderPk() === this.keyManager.getMyPublicKey();
    }

    private countElected(term: number, view: number): number {
        return this.pbftStorage.countOfViewChange(term, view);
    }

    private countPrepared(term: number, view: number, blockHash: Buffer): number {
        return this.pbftStorage.getPrepareSendersPks(term, view, blockHash).length;
    }

    private isPrePrepared(term: number, view: number, blockHash: Buffer): boolean {
        const prePreparedBlock: Block = this.pbftStorage.getPrePrepareBlock(term, view);
        if (prePreparedBlock) {
            const prePreparedBlockHash = this.blockUtils.calculateBlockHash(prePreparedBlock);
            const metaData = {
                method: "isPrePrepared",
                height: this.term,
                prePreparedBlockHash,
                blockHash,
                eq: prePreparedBlockHash.equals(blockHash)
            };
            this.logger.log({ Subject: "Info", message: `isPrePrepared`, metaData });
            return prePreparedBlockHash.equals(blockHash);
        }
        return false;
    }

    private commitBlock(block: Block): void {
        this.committedLocally = true;
        this.logger.log({ Subject: "Flow", FlowType: "Commit", term: this.term, view: this.view, block });
        this.stopViewState();
        this.onCommittedBlock(this.CB);
    }
}