import { Block } from "./Block";
import { Config } from "./Config";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./network/Payload";
import { Logger } from "./logger/Logger";
import { Network } from "./network/Network";
import { PBFTStorage } from "./storage/PBFTStorage";
import { ViewState } from "./ViewState";
import { KeyManager } from "./keyManager/KeyManager";

export type onNewBlockCB = (block: Block) => void;


export interface BlockUtils {
    requestNewBlock(height: number): Promise<Block>;
    validateBlock: (block: Block) => Promise<boolean>;
    calculateBlockHash(block: Block): string;
}

export interface ConfigTerm extends Config {
    blockUtils: BlockUtils;
}



export class PBFTTerm {
    private readonly network: Network;
    private readonly pbftStorage: PBFTStorage;
    private readonly logger: Logger;
    private readonly keyManager: KeyManager;

    private view: number;
    private electedOnView: number;
    private viewState: ViewState;
    private CB: Block;
    private disposed: boolean = false;
    private committedLocally: boolean = false;

    public readonly blockUtils: BlockUtils;
    public readonly electionTriggerFactory: ElectionTriggerFactory;

    constructor(
        config: ConfigTerm,
        private readonly term: number,
        private readonly networkMembers: string[],
        private onCommittedBlock: (block: Block) => void) {
        // config
        this.network = config.network;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTriggerFactory = config.electionTriggerFactory;
        this.blockUtils = config.blockUtils;
        this.keyManager = config.keyManager;

        this.view = 0;
        this.startTerm();
    }

    public async startTerm(): Promise<void> {
        this.initView(0);
        if (this.isLeader(this.keyManager.getMyPublicKey())) {
            try {
                this.CB = await this.blockUtils.requestNewBlock(this.term);
                if (this.disposed) {
                    return;
                }
                this.pbftStorage.storePrePrepare(this.term, this.view, this.CB);
                this.broadcastPrePrepare(this.term, this.view, this.CB);
            }
            catch (err) {
                this.logger.log(err);
            }
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


    private onLeaderChange(): void {
        this.initView(this.view + 1);
        this.logger.log({ Subject: "Flow", FlowType: "LeaderChange", leaderId: this.getCurrentLeader(), term: this.term, newView: this.view });
        const data = { term: this.term, newView: this.view };
        const payload: ViewChangePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data: data
        };
        const myPublicKey: string = this.keyManager.getMyPublicKey();
        this.pbftStorage.storeViewChange(this.term, this.view, myPublicKey);
        if (this.isLeader(myPublicKey)) {
            this.checkElected(this.term, this.view);
        } else {
            this.network.sendToMembers([this.getCurrentLeader()], "view-change", payload);
        }
    }

    private broadcastPrePrepare(term: number, view: number, block: Block): void {
        const data = { block, view, term };
        const payload: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data: data
        };
        this.network.sendToMembers(this.getOtherMembers(), "preprepare", payload);
    }

    private broadcastPrepare(term: number, view: number, block: Block): void {
        const data = { blockHash: this.blockUtils.calculateBlockHash(block), view, term };
        const payload: PreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data: data
        };
        this.network.sendToMembers(this.getOtherMembers(), "prepare", payload);
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
        const blockHash: string = this.blockUtils.calculateBlockHash(block);
        const myPublicKey: string = this.keyManager.getMyPublicKey();
        this.pbftStorage.storePrepare(term, view, blockHash, myPublicKey);
        this.pbftStorage.storePrePrepare(term, view, block);
        this.broadcastPrepare(term, view, block);
        this.checkPrepared(term, view, blockHash);
    }

    private async validatePrePreapare(payload: PrePreparePayload): Promise<boolean> {
        const { view, term, block } = payload.data;
        const publicKey = payload.pk;
        if (!this.isMember(publicKey)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from NON member: "${publicKey}"` });
            return false;
        }

        if (this.checkPrePrepare(term, view)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${publicKey}", already prepared` });
            return false;
        }

        const wanaBeLeaderPk = this.getLeader(view);
        if (wanaBeLeaderPk !== publicKey) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${publicKey}", block rejected because it was not sent by the current leader (${view})` });
            return false;
        }

        const isValidBlock = await this.blockUtils.validateBlock(block);
        if (this.disposed) {
            return false;
        }

        if (!isValidBlock) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${publicKey}", block is invalid` });
            return false;
        }

        return true;
    }

    private checkPrePrepare(term: number, view: number): boolean {
        return this.pbftStorage.getPrePrepare(term, view) !== undefined;
    }

    public onReceivePrepare(payload: PreparePayload): void {
        const { term, view, blockHash } = payload.data;
        const publicKey = payload.pk;
        if (!this.isMember(publicKey)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrepare from NON member: "${publicKey}"` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${publicKey}", prepare not logged because of unrelated view` });
            return;
        }

        if (this.isLeader(publicKey)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], blockHash:[${blockHash}], onReceivePrepare from "${publicKey}", prepare not logged as we don't accept prepare from the leader` });
            return;
        }

        this.pbftStorage.storePrepare(term, view, blockHash, publicKey);

        if (this.view === view) {
            this.checkPrepared(term, view, blockHash);
        }
    }

    public onReceiveViewChange(payload: ViewChangePayload): void {
        const { newView, term } = payload.data;
        const publicKey = payload.pk;
        const leaderToBePk = this.getLeader(newView);
        const myPublicKey: string = this.keyManager.getMyPublicKey();

        if (!this.isMember(publicKey)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from NON member: "${publicKey}"` });
            return;
        }

        if (leaderToBePk !== myPublicKey) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], newView:[${newView}], onReceiveViewChange from "${publicKey}", ignored because the newView doesn't match me as the leader` });
            return;
        }

        if (this.view > newView) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${publicKey}", ignored because of unrelated view` });
            return;
        }

        this.pbftStorage.storeViewChange(term, newView, publicKey);
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
        const dataPP = { term: this.term, view, block };
        const PP: PrePreparePayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(dataPP),
            data: dataPP
        };
        this.CB = block;
        this.logger.log({ Subject: "Flow", FlowType: "Elected", term: this.term, view, blockHash: this.blockUtils.calculateBlockHash(block) });
        const dataNV = { term: this.term, view, PP };
        const newViewPayload: NewViewPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(dataNV),
            data: dataNV
        };
        this.pbftStorage.storePrePrepare(this.term, this.view, block);
        this.network.sendToMembers(this.getOtherMembers(), "new-view", newViewPayload);
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
        const myPublicKey: string = this.keyManager.getMyPublicKey();
        this.pbftStorage.storeCommit(term, view, blockHash, myPublicKey);
        const data = { term, view, blockHash };
        const payload: CommitPayload = {
            pk: this.keyManager.getMyPublicKey(),
            signature: this.keyManager.sign(data),
            data: data
        };
        this.network.sendToMembers(this.getOtherMembers(), "commit", payload);
        this.checkCommit(term, view, blockHash);
    }

    public onReceiveCommit(payload: CommitPayload): void {
        const { term, view, blockHash } = payload.data;
        const publicKey = payload.pk;
        if (!this.isMember(publicKey)) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveCommit from NON member: "${publicKey}"` });
            return;
        }
        this.pbftStorage.storeCommit(term, view, blockHash, publicKey);

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
        const { PP, view, term } = payload.data;
        const publicKey = payload.pk;
        const wanaBeLeaderPk = this.getLeader(view);
        if (wanaBeLeaderPk !== publicKey) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${publicKey}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${publicKey}", view is from the past` });
            return;
        }

        if (view !== PP.data.view) {
            this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${publicKey}", view doesn't match PP.view` });
            return;
        }

        if (await this.validatePrePreapare(PP)) {
            this.initView(view);
            this.processPrePrepare(PP);
        }
    }

    private getF(): number {
        return Math.floor(this.networkMembers.length / 3);
    }

    private getOtherMembers(): string[] {
        return this.networkMembers.filter(function(m) { return m !== this.keyManager.getMyPublicKey(); });
    }

    private isLeader(publicKey: string): boolean {
        return this.getCurrentLeader() === publicKey;
    }

    private isMember(publicKey: string): boolean {
        return this.networkMembers.indexOf(publicKey) > -1;
    }

    private getLeader(view: number) {
        const index = view % this.networkMembers.length;
        return this.networkMembers[index];
    }

    public getCurrentLeader(): string {
        return this.getLeader(this.view);
    }

    private countElected(term: number, view: number): number {
        return this.pbftStorage.countOfViewChange(term, view);
    }

    private countPrepared(term: number, view: number, blockHash: string): number {
        return this.pbftStorage.getPrepare(term, view, blockHash).length;
    }

    private isPrePrepared(term: number, view: number, blockHash: string): boolean {
        const prePreparedBlock: Block = this.pbftStorage.getPrePrepare(term, view);
        return prePreparedBlock && (this.blockUtils.calculateBlockHash(prePreparedBlock) === blockHash);
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