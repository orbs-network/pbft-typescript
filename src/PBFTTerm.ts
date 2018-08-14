import { Block } from "./Block";
import { extractBlock } from "./blockExtractor/BlockExtractor";
import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTrigger, ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { CommitPayload, NewViewPayload, Payload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./networkCommunication/Payload";
import { validatePrepared } from "./proofsValidator/ProofsValidator";
import { PBFTStorage, PreparedProof } from "./storage/PBFTStorage";

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
    private readonly myPk: string;
    private readonly termMembersPKs: string[];
    private readonly otherMembersPKs: string[];

    private leaderPk: string;
    private view: number;
    private newViewLocally: number = -1;
    private electionTrigger: ElectionTrigger;
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

        this.myPk = this.keyManager.getMyPublicKey();
        this.termMembersPKs = this.networkCommunication.getMembersPKs(term);
        this.otherMembersPKs = this.termMembersPKs.filter(pk => pk !== this.myPk);
        this.startTerm();
    }

    private async startTerm(): Promise<void> {
        this.initView(0);
        let metaData = {
            method: "startTerm",
            height: this.term,
            prevBlockHash: new Buffer("")
        };
        this.logger.log({ subject: "Info", message: `on startTerm`, metaData: metaData });
        if (this.isLeader()) {
            this.logger.log({ subject: "Info", message: `Leader startTerm`, metaData: metaData });
            const block: Block = await this.blockUtils.requestNewBlock(this.term);
            metaData = {
                method: "requestNewBlock",
                height: this.term,
                prevBlockHash: block.header.prevBlockHash
            };
            this.logger.log({ subject: "Info", message: `generated new block`, metaData });
            if (this.disposed) {
                return;
            }

            const payload: PrePreparePayload = this.buildPrePreparePayload(this.term, this.view, block);
            this.pbftStorage.storePrePrepare(this.term, this.view, payload);
            this.sendPrePrepare(payload);
        }
    }

    public getView(): number {
        return this.view;
    }

    private setView(view: number) {
        if (this.view !== view) {
            this.initView(view);
        }
    }

    private initView(view: number): void {
        this.preparedLocally = false;
        this.view = view;
        this.leaderPk = this.calcLeaderPk(this.view);
        this.startElectionTrigger(view);
    }

    private stopElectionTrigger(): void {
        if (this.electionTrigger) {
            this.electionTrigger.stop();
            this.electionTrigger = undefined;
        }
    }

    private startElectionTrigger(view: number) {
        this.stopElectionTrigger();
        if (!this.electionTrigger) {
            this.electionTrigger = this.electionTriggerFactory(view);
            this.electionTrigger.start(() => this.onLeaderChange());
        }
    }

    public dispose(): void {
        this.pbftStorage.clearTermLogs(this.term);
        this.disposed = true;
        this.stopElectionTrigger();
    }

    private calcLeaderPk(view: number): string {
        const index = view % this.termMembersPKs.length;
        return this.termMembersPKs[index];
    }

    private onLeaderChange(): void {
        this.setView(this.view + 1);
        const preparedProof: PreparedProof = this.pbftStorage.getLatestPreparedProof(this.term, this.getF());
        this.logger.log({ subject: "Flow", FlowType: "LeaderChange", leaderPk: this.leaderPk, term: this.term, newView: this.view });
        const data = { term: this.term, newView: this.view, preparedProof };
        const payload: ViewChangePayload = {
            pk: this.myPk,
            signature: this.keyManager.sign(data),
            data
        };
        this.pbftStorage.storeViewChange(this.term, this.view, payload);
        if (this.isLeader()) {
            this.checkElected(this.term, this.view);
        } else {
            this.sendViewChange(payload);
        }
    }

    private sendPrePrepare(payload: PrePreparePayload): void {
        this.networkCommunication.sendPrePrepare(this.otherMembersPKs, payload);
        this.logger.log({
            subject: "GossipSend",
            message: "preprepare",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: payload.data.term,
            view: payload.data.view,
            blockHash: payload.data.blockHash.toString("Hex")
        });
    }

    private sendPrepare(payload: PreparePayload): void {
        this.networkCommunication.sendPrepare(this.otherMembersPKs, payload);
        this.logger.log({
            subject: "GossipSend",
            message: "prepare",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: payload.data.term,
            view: payload.data.view,
            blockHash: payload.data.blockHash.toString("Hex")
        });
    }

    private sendCommit(payload: CommitPayload): void {
        this.networkCommunication.sendCommit(this.otherMembersPKs, payload);
        this.logger.log({
            subject: "GossipSend",
            message: "commit",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: payload.data.term,
            view: payload.data.view,
            blockHash: payload.data.blockHash.toString("Hex")
        });
    }

    private sendViewChange(payload: ViewChangePayload): void {
        this.networkCommunication.sendViewChange(this.leaderPk, payload);
        this.logger.log({
            subject: "GossipSend",
            message: "view-change",
            senderPk: this.myPk,
            targetPks: [this.leaderPk],
            term: payload.data.term,
            view: payload.data.newView
        });
    }

    private sendNewView(payload: NewViewPayload): void {
        this.networkCommunication.sendNewView(this.otherMembersPKs, payload);
        this.logger.log({
            subject: "GossipSend",
            message: "new-view",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: payload.data.term,
            view: payload.data.view
        });
    }

    private buildPrePreparePayload(term: number, view: number, block: Block): PrePreparePayload {
        const blockHash: Buffer = this.blockUtils.calculateBlockHash(block);
        const data = { blockHash, view, term };
        const payload: PrePreparePayload = {
            pk: this.myPk,
            signature: this.keyManager.sign(data),
            data,
            block,
        };

        return payload;
    }

    private buildPreparePayload(term: number, view: number, blockHash: Buffer): PreparePayload {
        const data = { blockHash, view, term };
        const payload: PreparePayload = {
            pk: this.myPk,
            signature: this.keyManager.sign(data),
            data
        };

        return payload;
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
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], processPrePrepare, view doesn't match` });
            return;
        }

        const preparePayoad: PreparePayload = this.buildPreparePayload(term, view, blockHash);
        this.pbftStorage.storePrepare(term, view, preparePayoad);
        this.pbftStorage.storePrePrepare(term, view, payload);
        this.sendPrepare(preparePayoad);
        this.checkPrepared(term, view, blockHash);
    }

    private async validatePrePreapare(payload: PrePreparePayload): Promise<boolean> {
        const { data, block, pk: senderPk } = payload;
        const { view, term, blockHash } = data;

        if (this.checkPrePrepare(term, view)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", already prepared` });
            return false;
        }

        if (!this.verifyPayload(payload)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], validatePrePreapare from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it was not sent by the current leader (${view})` });
            return false;
        }

        const givenBlockHash = this.blockUtils.calculateBlockHash(block);
        if (givenBlockHash.equals(blockHash) === false) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it doesn't match the given blockHash (${view})` });
            return false;
        }

        const isValidBlock = await this.blockUtils.validateBlock(block);
        if (this.disposed) {
            return false;
        }

        if (!isValidBlock) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", block is invalid` });
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

        if (!this.verifyPayload(payload)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrepare from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ subject: "Warning", message: `unrelated view`, metaData });
            return;
        }

        if (this.leaderPk === senderPk) {
            this.logger.log({ subject: "Warning", message: `prepare received from leader is forbidden`, metaData });
            return;
        }

        this.pbftStorage.storePrepare(term, view, payload);

        if (this.view === view) {
            this.checkPrepared(term, view, blockHash);
        }
    }

    public onReceiveViewChange(payload: ViewChangePayload): void {
        if (this.isViewChangePayloadValid(this.myPk, this.view, payload)) {
            const { data } = payload;
            const { newView, term } = data;
            this.pbftStorage.storeViewChange(term, newView, payload);
            this.checkElected(term, newView);
        }
    }

    private verifyPayload(payload: Payload): boolean {
        return this.keyManager.verify(payload.data, payload.signature, payload.pk);
    }

    private isViewChangePayloadValid(targetLeaderPk: string, view: number, payload: ViewChangePayload): boolean {
        const { pk: senderPk, data } = payload;
        const { newView, term, preparedProof } = data;
        if (!this.verifyPayload(payload)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the signature verification failed` });
            return false;
        }

        if (view > newView) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because of unrelated view` });
            return false;
        }

        if (preparedProof && validatePrepared(preparedProof, this.getF(), this.keyManager, this.blockUtils, this.termMembersPKs, view => this.calcLeaderPk(view)) === false) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the preparedProof is invalid` });
            return false;
        }

        const leaderToBePk = this.calcLeaderPk(newView);
        if (leaderToBePk !== targetLeaderPk) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], newView:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the newView doesn't match the target leader` });
            return false;
        }

        return true;
    }

    private checkElected(term: number, view: number): void {
        if (this.newViewLocally < view) {
            const viewChangeProof = this.pbftStorage.getViewChangeProof(term, view, this.getF());
            if (viewChangeProof) {
                this.onElected(view, viewChangeProof);
            }
        }
    }

    private async onElected(view: number, VCProof: ViewChangePayload[]) {
        this.newViewLocally = view;
        this.setView(view);
        let block: Block = extractBlock(VCProof);
        if (!block) {
            block = await this.blockUtils.requestNewBlock(this.term);
            if (this.disposed) {
                return;
            }
        }

        const blockHash = this.blockUtils.calculateBlockHash(block);
        const dataPP = { term: this.term, view, blockHash };
        const PP: PrePreparePayload = {
            pk: this.myPk,
            signature: this.keyManager.sign(dataPP),
            data: dataPP,
            block
        };
        this.logger.log({ subject: "Flow", FlowType: "Elected", term: this.term, view, blockHash: blockHash.toString("Hex") });
        const dataNV = { term: this.term, view, PP, VCProof };
        const newViewPayload: NewViewPayload = {
            pk: this.myPk,
            signature: this.keyManager.sign(dataNV),
            data: dataNV
        };
        this.pbftStorage.storePrePrepare(this.term, this.view, PP);
        this.sendNewView(newViewPayload);
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
                this.logger.log({ subject: "Info", message: `counting`, metaData });
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
            pk: this.myPk,
            signature: this.keyManager.sign(data),
            data
        };
        this.pbftStorage.storeCommit(term, view, payload);
        this.sendCommit(payload);
        this.checkCommitted(term, view, blockHash);
    }

    public onReceiveCommit(payload: CommitPayload): void {
        const { data, pk: senderPk } = payload;
        const { term, view, blockHash } = data;

        if (!this.verifyPayload(payload)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveCommit from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        this.pbftStorage.storeCommit(term, view, payload);
        this.checkCommitted(term, view, blockHash);
    }

    private checkCommitted(term: number, view: number, blockHash: Buffer): void {
        if (!this.committedLocally) {
            if (this.isPrePrepared(term, view, blockHash)) {
                const commits = this.pbftStorage.getCommitSendersPks(term, view, blockHash).length;
                if (commits >= this.getF() * 2 + 1) {
                    const block = this.pbftStorage.getPrePrepareBlock(term, view);
                    this.commitBlock(block, blockHash);
                }
            }
        }
    }

    private validateViewChangeProof(targetTerm: number, targetView: number, VCProof: ViewChangePayload[]): boolean {
        if (!VCProof || !Array.isArray(VCProof)) {
            return false;
        }

        if (VCProof.length < this.getF() * 2 + 1) {
            return false;
        }

        const allMatchTargetTerm = VCProof.every(viewChangePayload => viewChangePayload.data.term === targetTerm);
        if (!allMatchTargetTerm) {
            return false;
        }

        const allMatchTargetView = VCProof.every(viewChangePayload => viewChangePayload.data.newView === targetView);
        if (!allMatchTargetView) {
            return false;
        }

        const allPkAreUnique = VCProof.reduce((prev, current) => prev.set(current.pk, true), new Map()).size === VCProof.length;
        if (!allPkAreUnique) {
            return false;
        }


        return VCProof.every(viewChangePayload => this.isViewChangePayloadValid(this.calcLeaderPk(targetView), targetView, viewChangePayload));
    }

    public async onReceiveNewView(payload: NewViewPayload): Promise<void> {
        const { pk: senderPk, data } = payload;
        const { PP, view, term, VCProof } = data;

        if (!this.verifyPayload(payload)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.validateViewChangeProof(term, view, VCProof) === false) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", VCProof is invalid` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view is from the past` });
            return;
        }

        if (view !== PP.data.view) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view doesn't match PP.view` });
            return;
        }

        const expectedBlock: Block = extractBlock(VCProof);
        if (expectedBlock !== undefined) {
            const expectedBlockHash = this.blockUtils.calculateBlockHash(expectedBlock);
            const ppBlockHash = this.blockUtils.calculateBlockHash(PP.block);
            if (expectedBlockHash.equals(ppBlockHash) === false) {
                this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", the given block (PP.block) doesn't match the best block from the VCProof` });
                return;
            }
        }

        if (await this.validatePrePreapare(PP)) {
            this.newViewLocally = view;
            this.setView(view);
            this.processPrePrepare(PP);
        }
    }

    private getF(): number {
        return Math.floor((this.termMembersPKs.length - 1) / 3);
    }

    public isLeader(): boolean {
        return this.leaderPk === this.myPk;
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
            this.logger.log({ subject: "Info", message: `isPrePrepared`, metaData });
            return prePreparedBlockHash.equals(blockHash);
        }
        return false;
    }

    private commitBlock(block: Block, blockHash: Buffer): void {
        this.committedLocally = true;
        this.logger.log({ subject: "Flow", FlowType: "Commit", term: this.term, view: this.view, blockHash: blockHash.toString("Hex") });
        this.stopElectionTrigger();
        this.onCommittedBlock(block);
    }
}