import { Block } from "./Block";
import { getLatestBlockFromViewChangeMessages } from "./blockExtractor/BlockExtractor";
import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTrigger } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { BlockRef, CommitMessage, LeanHelixMessage, MessageType, NewViewHeader, NewViewMessage, PreparedProof, PrepareMessage, PrePrepareMessage, SenderSignature, ViewChangeMessage, ViewChangeHeader, ViewChangeConfirmation } from "./networkCommunication/Messages";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { validatePreparedProof } from "./proofsValidator/ProofsValidator";
import { PBFTStorage, PreparedMessages } from "./storage/PBFTStorage";
import { MessagesFactory } from "./networkCommunication/MessagesFactory";

export type onNewBlockCB = (block: Block) => void;

export interface TermConfig {
    electionTrigger: ElectionTrigger;
    networkCommunication: NetworkCommunication;
    pbftStorage: PBFTStorage;
    keyManager: KeyManager;
    logger: Logger;
    blockUtils: BlockUtils;
}

export class PBFTTerm {
    private readonly electionTrigger: ElectionTrigger;
    private readonly networkCommunication: NetworkCommunication;
    private readonly blockUtils: BlockUtils;
    private readonly pbftStorage: PBFTStorage;
    private readonly keyManager: KeyManager;
    private readonly logger: Logger;
    private readonly myPk: string;
    private readonly committeeMembersPKs: string[];
    private readonly noneCommitteeMembersPKs: string[];
    private readonly messagesFactory: MessagesFactory;

    private leaderPk: string;
    private view: number;
    private newViewLocally: number = -1;
    private disposed: boolean = false;
    private preparedLocally: boolean = false;
    private committedLocally: boolean = false;


    constructor(config: TermConfig, private readonly blockHeight: number, private onCommittedBlock: (block: Block) => void) {
        // config
        this.keyManager = config.keyManager;
        this.networkCommunication = config.networkCommunication;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTrigger = config.electionTrigger;
        this.blockUtils = config.blockUtils;

        this.myPk = this.keyManager.getMyPublicKey();
        this.committeeMembersPKs = this.networkCommunication.requestOrderedCommittee(blockHeight);
        this.noneCommitteeMembersPKs = this.committeeMembersPKs.filter(pk => pk !== this.myPk);
        this.messagesFactory = new MessagesFactory(this.blockUtils.calculateBlockHash, this.keyManager);

        this.startTerm();
    }

    private async startTerm(): Promise<void> {
        this.initView(0);
        let metaData = {
            method: "startTerm",
            height: this.blockHeight
        };
        this.logger.log({ subject: "Info", message: `on startTerm`, metaData: metaData });
        if (this.isLeader()) {
            this.logger.log({ subject: "Info", message: `Leader startTerm`, metaData: metaData });
            const block: Block = await this.blockUtils.requestNewBlock(this.blockHeight);
            metaData = {
                method: "requestNewBlock",
                height: this.blockHeight
            };
            this.logger.log({ subject: "Info", message: `generated new block`, metaData });
            if (this.disposed) {
                return;
            }

            const message: PrePrepareMessage = this.messagesFactory.createPreprepareMessage(this.blockHeight, this.view, block);
            this.pbftStorage.storePrePrepare(message);
            this.sendPrePrepare(message);
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
        this.electionTrigger.registerOnTrigger(this.view, view => this.onLeaderChange(view));
    }

    public dispose(): void {
        this.pbftStorage.clearBlockHeightLogs(this.blockHeight);
        this.disposed = true;
        this.electionTrigger.unregisterOnTrigger();
    }

    private calcLeaderPk(view: number): string {
        const index = view % this.committeeMembersPKs.length;
        return this.committeeMembersPKs[index];
    }

    private onLeaderChange(view: number): void {
        if (view !== this.view) {
            return;
        }
        this.setView(this.view + 1);
        this.logger.log({ subject: "Flow", FlowType: "LeaderChange", leaderPk: this.leaderPk, blockHeight: this.blockHeight, newView: this.view });

        const prepared: PreparedMessages = this.pbftStorage.getLatestPrepared(this.blockHeight, this.getF());
        const message: ViewChangeMessage = this.messagesFactory.createViewChangeMessage(this.blockHeight, this.view, prepared);
        this.pbftStorage.storeViewChange(message);
        if (this.isLeader()) {
            this.checkElected(this.blockHeight, this.view);
        } else {
            this.sendViewChange(message);
        }
    }

    private sendPrePrepare(message: PrePrepareMessage): void {
        this.networkCommunication.sendPrePrepare(this.noneCommitteeMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "preprepare",
            senderPk: this.myPk,
            targetPks: this.noneCommitteeMembersPKs,
            blockHeight: message.signedHeader.blockHeight,
            view: message.signedHeader.view,
            blockHash: message.signedHeader.blockHash.toString("Hex")
        });
    }

    private sendPrepare(message: PrepareMessage): void {
        this.networkCommunication.sendPrepare(this.noneCommitteeMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "prepare",
            senderPk: this.myPk,
            targetPks: this.noneCommitteeMembersPKs,
            blockHeight: message.signedHeader.blockHeight,
            view: message.signedHeader.view,
            blockHash: message.signedHeader.blockHash.toString("Hex")
        });
    }

    private sendCommit(message: CommitMessage): void {
        this.networkCommunication.sendCommit(this.noneCommitteeMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "commit",
            senderPk: this.myPk,
            targetPks: this.noneCommitteeMembersPKs,
            blockHeight: message.signedHeader.blockHeight,
            view: message.signedHeader.view,
            blockHash: message.signedHeader.blockHash.toString("Hex")
        });
    }

    private sendViewChange(message: ViewChangeMessage): void {
        this.networkCommunication.sendViewChange(this.leaderPk, message);
        this.logger.log({
            subject: "GossipSend",
            message: "view-change",
            senderPk: this.myPk,
            targetPks: [this.leaderPk],
            blockHeight: message.signedHeader.blockHeight,
            view: message.signedHeader.view
        });
    }

    private sendNewView(message: NewViewMessage): void {
        this.networkCommunication.sendNewView(this.noneCommitteeMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "new-view",
            senderPk: this.myPk,
            targetPks: this.noneCommitteeMembersPKs,
            blockHeight: message.signedHeader.blockHeight,
            view: message.signedHeader.view
        });
    }

    public async onReceivePrePrepare(message: PrePrepareMessage): Promise<void> {
        if (await this.validatePrePreapare(message)) {
            this.processPrePrepare(message);
        }
    }

    private processPrePrepare(preprepareMessage: PrePrepareMessage): void {
        const { view, blockHeight, blockHash } = preprepareMessage.signedHeader;
        if (this.view !== view) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], processPrePrepare, view doesn't match` });
            return;
        }

        const prepareMessage: PrepareMessage = this.messagesFactory.createPrepareMessage(blockHeight, view, blockHash);
        this.pbftStorage.storePrePrepare(preprepareMessage);
        this.pbftStorage.storePrepare(prepareMessage);
        this.sendPrepare(prepareMessage);
        this.checkPrepared(blockHeight, view, blockHash);
    }

    private async validatePrePreapare(message: PrePrepareMessage): Promise<boolean> {
        const { signedHeader, block, sender } = message;
        const { senderPublicKey: senderPk } = sender;
        const { view, blockHeight, blockHash } = signedHeader;

        if (this.hasPrePrepare(blockHeight, view)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceivePrePrepare from "${senderPk}", already prepared` });
            return false;
        }

        if (!this.keyManager.verifyBlockRef(message.signedHeader, message.sender)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], validatePrePreapare from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        const wanaBeLeaderId = this.calcLeaderPk(view);
        if (wanaBeLeaderId !== senderPk) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it was not sent by the current leader (${view})` });
            return false;
        }

        const givenBlockHash = this.blockUtils.calculateBlockHash(block);
        if (givenBlockHash.equals(blockHash) === false) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceivePrePrepare from "${senderPk}", block rejected because it doesn't match the given blockHash (${view})` });
            return false;
        }

        const isValidBlock = await this.blockUtils.validateBlock(block);
        if (this.disposed) {
            return false;
        }

        if (!isValidBlock) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceivePrePrepare from "${senderPk}", block is invalid` });
            return false;
        }

        return true;
    }

    private hasPrePrepare(blockHeight: number, view: number): boolean {
        return this.pbftStorage.getPrePrepareBlock(blockHeight, view) !== undefined;
    }

    public onReceivePrepare(message: PrepareMessage): void {
        const { sender, signedHeader } = message;
        const { senderPublicKey: senderPk } = sender;
        const { blockHeight, view, blockHash } = signedHeader;
        const metaData = {
            method: "onReceivePrepare",
            blockHeight,
            view,
            blockHash,
            senderPk
        };

        if (!this.keyManager.verifyBlockRef(message.signedHeader, message.sender)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceivePrepare from "${senderPk}", ignored because the signature verification failed` });
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

        this.pbftStorage.storePrepare(message);

        if (this.view === view) {
            this.checkPrepared(blockHeight, view, blockHash);
        }
    }

    public onReceiveViewChange(message: ViewChangeMessage): void {
        if (this.isViewChangeValid(this.myPk, this.view, message)) {
            if (message.block && message.signedHeader.preparedProof) {
                const isValidDigest = this.blockUtils.calculateBlockHash(message.block).equals(message.signedHeader.preparedProof.preprepareBlockRefMessage.signedHeader.blockHash);
                if (!isValidDigest) {
                    return;
                }
            }
            const { signedHeader } = message;
            const { view, blockHeight } = signedHeader;
            this.pbftStorage.storeViewChange(message);
            this.checkElected(blockHeight, view);
        }
    }

    private isViewChangeValid(targetLeaderPk: string, view: number, message: { signedHeader: ViewChangeHeader, sender: SenderSignature }): boolean {
        const { signedHeader, sender } = message;
        const { senderPublicKey: senderPk } = sender;
        const { view: newView, blockHeight, preparedProof } = signedHeader;

        if (!this.keyManager.verifyViewChange(message.signedHeader, message.sender)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the signature verification failed` });
            return false;
        }

        if (view > newView) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because of unrelated view` });
            return false;
        }

        if (preparedProof && validatePreparedProof(this.blockHeight, newView, preparedProof, this.getF(), this.keyManager, this.committeeMembersPKs, (view: number) => this.calcLeaderPk(view)) === false) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the preparedProof is invalid` });
            return false;
        }

        const leaderToBePk = this.calcLeaderPk(newView);
        if (leaderToBePk !== targetLeaderPk) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], newView:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the newView doesn't match the target leader` });
            return false;
        }

        return true;
    }

    private checkElected(blockHeight: number, view: number): void {
        if (this.newViewLocally < view) {
            const viewChangeMessages = this.pbftStorage.getViewChangeMessages(blockHeight, view, this.getF());
            if (viewChangeMessages) {
                this.onElected(view, viewChangeMessages);
            }
        }
    }

    private async onElected(view: number, viewChangeMessages: ViewChangeMessage[]) {
        this.logger.log({ subject: "Flow", FlowType: "Elected", blockHeight: this.blockHeight, view });
        this.newViewLocally = view;
        this.setView(view);
        let block: Block = getLatestBlockFromViewChangeMessages(viewChangeMessages);
        if (!block) {
            block = await this.blockUtils.requestNewBlock(this.blockHeight);
            if (this.disposed) {
                return;
            }
        }

        const preprepareMessage: PrePrepareMessage = this.messagesFactory.createPreprepareMessage(this.blockHeight, view, block);
        const viewChangeVotes: ViewChangeConfirmation[] = viewChangeMessages.map(vc => ({ signedHeader: vc.signedHeader, sender: vc.sender }));
        const newViewMessage: NewViewMessage = this.messagesFactory.createNewViewMessage(this.blockHeight, view, preprepareMessage, viewChangeVotes);
        this.pbftStorage.storePrePrepare(preprepareMessage);
        this.sendNewView(newViewMessage);
    }

    private checkPrepared(blockHeight: number, view: number, blockHash: Buffer) {
        if (!this.preparedLocally) {
            if (this.isPrePrepared(blockHeight, view, blockHash)) {
                const countPrepared = this.countPrepared(blockHeight, view, blockHash);
                const metaData = {
                    method: "checkPrepared",
                    height: this.blockHeight,
                    blockHash,
                    countPrepared
                };
                this.logger.log({ subject: "Info", message: `counting`, metaData });
                if (countPrepared >= this.getF() * 2) {
                    this.onPrepared(blockHeight, view, blockHash);
                }
            }
        }
    }

    private onPrepared(blockHeight: number, view: number, blockHash: Buffer): void {
        this.preparedLocally = true;
        const message: CommitMessage = this.messagesFactory.createCommitMessage(blockHeight, view, blockHash);
        this.pbftStorage.storeCommit(message);
        this.sendCommit(message);
        this.checkCommitted(blockHeight, view, blockHash);
    }

    public onReceiveCommit(message: CommitMessage): void {
        const { signedHeader, sender } = message;
        const { senderPublicKey: senderPk } = sender;
        const { view, blockHeight, blockHash } = signedHeader;

        if (!this.keyManager.verifyBlockRef(signedHeader, sender)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveCommit from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        this.pbftStorage.storeCommit(message);
        this.checkCommitted(blockHeight, view, blockHash);
    }

    private checkCommitted(blockHeight: number, view: number, blockHash: Buffer): void {
        if (!this.committedLocally) {
            if (this.isPrePrepared(blockHeight, view, blockHash)) {
                const commits = this.pbftStorage.getCommitSendersPks(blockHeight, view, blockHash).length;
                if (commits >= this.getF() * 2 + 1) {
                    const block = this.pbftStorage.getPrePrepareBlock(blockHeight, view);
                    this.commitBlock(block, blockHash);
                }
            }
        }
    }

    private validateViewChangeVotes(targetBlockHeight: number, targetView: number, votes: ViewChangeConfirmation[]): boolean {
        if (!votes || !Array.isArray(votes)) {
            return false;
        }

        if (votes.length < this.getF() * 2 + 1) {
            return false;
        }

        const allMatchTargetBlockHeight = votes.every(viewChangeMessage => viewChangeMessage.signedHeader.blockHeight === targetBlockHeight);
        if (!allMatchTargetBlockHeight) {
            return false;
        }

        const allMatchTargetView = votes.every(viewChangeMessage => viewChangeMessage.signedHeader.view === targetView);
        if (!allMatchTargetView) {
            return false;
        }

        const allPkAreUnique = votes.reduce((prev, current) => prev.set(current.sender.senderPublicKey, true), new Map()).size === votes.length;
        if (!allPkAreUnique) {
            return false;
        }

        return true;
    }

    private latestViewChangeVote(votes: ViewChangeConfirmation[]): ViewChangeConfirmation {
        const filteredVotes = votes
            .filter(vote => vote.signedHeader.preparedProof !== undefined)
            .sort((a, b) => b.signedHeader.preparedProof.preprepareBlockRefMessage.signedHeader.view - a.signedHeader.preparedProof.preprepareBlockRefMessage.signedHeader.view);

        if (filteredVotes.length > 0) {
            return filteredVotes[0];
        } else {
            return undefined;
        }
    }

    public async onReceiveNewView(message: NewViewMessage): Promise<void> {
        const { signedHeader, sender, preprepareMessage } = message;
        const { senderPublicKey: senderPk } = sender;
        const { view, blockHeight, viewChangeConfirmations } = signedHeader;

        if (!this.keyManager.verifyNewView(message.signedHeader, message.sender)) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        const futureLeaderId = this.calcLeaderPk(view);
        if (futureLeaderId !== senderPk) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.validateViewChangeVotes(blockHeight, view, viewChangeConfirmations) === false) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", votes is invalid` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", view is from the past` });
            return;
        }

        if (view !== preprepareMessage.signedHeader.view) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", view doesn't match PP.view` });
            return;
        }

        if (blockHeight !== preprepareMessage.signedHeader.blockHeight) {
            this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", blockHeight doesn't match PP.blockHeight` });
            return;
        }

        const latestVote: ViewChangeConfirmation = this.latestViewChangeVote(viewChangeConfirmations);
        if (latestVote !== undefined) {
            const viewChangeMessageValid = this.isViewChangeValid(futureLeaderId, view, latestVote);
            if (!viewChangeMessageValid) {
                this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", view change votes are invalid` });
                return;
            }

            const latestVoteBlockHash = latestVote.signedHeader.preparedProof && latestVote.signedHeader.preparedProof.preprepareBlockRefMessage.signedHeader.blockHash;
            if (latestVoteBlockHash) {
                const ppBlockHash = this.blockUtils.calculateBlockHash(preprepareMessage.block);
                if (latestVoteBlockHash.equals(ppBlockHash) === false) {
                    this.logger.log({ subject: "Warning", message: `blockHeight:[${blockHeight}], view:[${view}], onReceiveNewView from "${senderPk}", the given block (PP.block) doesn't match the best block from the VCProof` });
                    return;
                }
            }
        }

        if (await this.validatePrePreapare(preprepareMessage)) {
            this.newViewLocally = view;
            this.setView(view);
            this.processPrePrepare(preprepareMessage);
        }
    }

    private getF(): number {
        return Math.floor((this.committeeMembersPKs.length - 1) / 3);
    }

    public isLeader(): boolean {
        return this.leaderPk === this.myPk;
    }

    private countPrepared(blockHeight: number, view: number, blockHash: Buffer): number {
        return this.pbftStorage.getPrepareSendersPks(blockHeight, view, blockHash).length;
    }

    private isPrePrepared(blockHeight: number, view: number, blockHash: Buffer): boolean {
        const prePreparedBlock: Block = this.pbftStorage.getPrePrepareBlock(blockHeight, view);
        if (prePreparedBlock) {
            const prePreparedBlockHash = this.blockUtils.calculateBlockHash(prePreparedBlock);
            const metaData = {
                method: "isPrePrepared",
                height: this.blockHeight,
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
        this.logger.log({ subject: "Flow", FlowType: "Commit", blockHeight: this.blockHeight, view: this.view, blockHash: blockHash.toString("Hex") });
        this.electionTrigger.unregisterOnTrigger();
        this.onCommittedBlock(block);
    }
}