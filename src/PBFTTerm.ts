import { Block } from "./Block";
import { getLatestBlockFromViewChangeMessages } from "./blockExtractor/BlockExtractor";
import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTrigger } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { BlockMessageContent, CommitMessage, LeanHelixMessage, MessageType, NewViewContent, NewViewMessage, PreparedProof, PrepareMessage, PrePrepareMessage, SignaturePair, ViewChangeMessage, ViewChangeMessageContent, ViewChangeVote } from "./networkCommunication/Messages";
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
    private readonly termMembersPKs: string[];
    private readonly otherMembersPKs: string[];
    private readonly messagesFactory: MessagesFactory;

    private leaderPk: string;
    private view: number;
    private newViewLocally: number = -1;
    private disposed: boolean = false;
    private preparedLocally: boolean = false;
    private committedLocally: boolean = false;


    constructor(config: TermConfig, private readonly term: number, private onCommittedBlock: (block: Block) => void) {
        // config
        this.keyManager = config.keyManager;
        this.networkCommunication = config.networkCommunication;
        this.pbftStorage = config.pbftStorage;
        this.logger = config.logger;
        this.electionTrigger = config.electionTrigger;
        this.blockUtils = config.blockUtils;

        this.myPk = this.keyManager.getMyPublicKey();
        this.termMembersPKs = this.networkCommunication.getMembersPKs(term);
        this.otherMembersPKs = this.termMembersPKs.filter(pk => pk !== this.myPk);
        this.messagesFactory = new MessagesFactory(this.blockUtils.calculateBlockHash, this.keyManager);

        this.startTerm();
    }

    private async startTerm(): Promise<void> {
        this.initView(0);
        let metaData = {
            method: "startTerm",
            height: this.term
        };
        this.logger.log({ subject: "Info", message: `on startTerm`, metaData: metaData });
        if (this.isLeader()) {
            this.logger.log({ subject: "Info", message: `Leader startTerm`, metaData: metaData });
            const block: Block = await this.blockUtils.requestNewBlock(this.term);
            metaData = {
                method: "requestNewBlock",
                height: this.term
            };
            this.logger.log({ subject: "Info", message: `generated new block`, metaData });
            if (this.disposed) {
                return;
            }

            const message: PrePrepareMessage = this.messagesFactory.createPreprepareMessage(this.term, this.view, block);
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
        this.pbftStorage.clearTermLogs(this.term);
        this.disposed = true;
        this.electionTrigger.unregisterOnTrigger();
    }

    private calcLeaderPk(view: number): string {
        const index = view % this.termMembersPKs.length;
        return this.termMembersPKs[index];
    }

    private onLeaderChange(view: number): void {
        if (view !== this.view) {
            return;
        }
        this.setView(this.view + 1);
        this.logger.log({ subject: "Flow", FlowType: "LeaderChange", leaderPk: this.leaderPk, term: this.term, newView: this.view });

        const prepared: PreparedMessages = this.pbftStorage.getLatestPrepared(this.term, this.getF());
        const message: ViewChangeMessage = this.messagesFactory.createViewChangeMessage(this.term, this.view, prepared);
        this.pbftStorage.storeViewChange(message);
        if (this.isLeader()) {
            this.checkElected(this.term, this.view);
        } else {
            this.sendViewChange(message);
        }
    }

    private sendPrePrepare(message: PrePrepareMessage): void {
        this.networkCommunication.sendPrePrepare(this.otherMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "preprepare",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: message.content.term,
            view: message.content.view,
            blockHash: message.content.blockHash.toString("Hex")
        });
    }

    private sendPrepare(message: PrepareMessage): void {
        this.networkCommunication.sendPrepare(this.otherMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "prepare",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: message.content.term,
            view: message.content.view,
            blockHash: message.content.blockHash.toString("Hex")
        });
    }

    private sendCommit(message: CommitMessage): void {
        this.networkCommunication.sendCommit(this.otherMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "commit",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: message.content.term,
            view: message.content.view,
            blockHash: message.content.blockHash.toString("Hex")
        });
    }

    private sendViewChange(message: ViewChangeMessage): void {
        this.networkCommunication.sendViewChange(this.leaderPk, message);
        this.logger.log({
            subject: "GossipSend",
            message: "view-change",
            senderPk: this.myPk,
            targetPks: [this.leaderPk],
            term: message.content.term,
            view: message.content.view
        });
    }

    private sendNewView(message: NewViewMessage): void {
        this.networkCommunication.sendNewView(this.otherMembersPKs, message);
        this.logger.log({
            subject: "GossipSend",
            message: "new-view",
            senderPk: this.myPk,
            targetPks: this.otherMembersPKs,
            term: message.content.term,
            view: message.content.view
        });
    }

    public async onReceivePrePrepare(message: PrePrepareMessage): Promise<void> {
        if (await this.validatePrePreapare(message)) {
            this.processPrePrepare(message);
        }
    }

    private processPrePrepare(preprepareMessage: PrePrepareMessage): void {
        const { view, term, blockHash } = preprepareMessage.content;
        if (this.view !== view) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], processPrePrepare, view doesn't match` });
            return;
        }

        const prepareMessage: PrepareMessage = this.messagesFactory.createPrepareMessage(term, view, blockHash);
        this.pbftStorage.storePrePrepare(preprepareMessage);
        this.pbftStorage.storePrepare(prepareMessage);
        this.sendPrepare(prepareMessage);
        this.checkPrepared(term, view, blockHash);
    }

    private async validatePrePreapare(message: PrePrepareMessage): Promise<boolean> {
        const { content, block, signaturePair } = message;
        const { signerPublicKey: senderPk } = signaturePair;
        const { view, term, blockHash } = content;

        if (this.hasPrePrepare(term, view)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderPk}", already prepared` });
            return false;
        }

        if (!this.verifyMessage(message)) {
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

    private hasPrePrepare(term: number, view: number): boolean {
        return this.pbftStorage.getPrePrepareBlock(term, view) !== undefined;
    }

    public onReceivePrepare(message: PrepareMessage): void {
        const { signaturePair, content } = message;
        const { signerPublicKey: senderPk } = signaturePair;
        const { term, view, blockHash } = content;
        const metaData = {
            method: "onReceivePrepare",
            term,
            view,
            blockHash,
            senderPk
        };

        if (!this.verifyMessage(message)) {
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

        this.pbftStorage.storePrepare(message);

        if (this.view === view) {
            this.checkPrepared(term, view, blockHash);
        }
    }

    public onReceiveViewChange(message: ViewChangeMessage): void {
        if (this.isViewChangeValid(this.myPk, this.view, message)) {
            if (message.block && message.content.preparedProof) {
                const isValidDigest = this.blockUtils.calculateBlockHash(message.block).equals(message.content.preparedProof.preprepareBlockRefMessage.content.blockHash);
                if (!isValidDigest) {
                    return;
                }
            }
            const { content } = message;
            const { view, term } = content;
            this.pbftStorage.storeViewChange(message);
            this.checkElected(term, view);
        }
    }

    private verifyMessage(message: LeanHelixMessage): boolean {
        return this.keyManager.verify(message.content, message.signaturePair.contentSignature, message.signaturePair.signerPublicKey);
    }

    private isViewChangeValid(targetLeaderPk: string, view: number, message: { content: ViewChangeMessageContent, signaturePair: SignaturePair }): boolean {
        const { content, signaturePair } = message;
        const { signerPublicKey: senderPk } = signaturePair;
        const { view: newView, term, preparedProof } = content;

        if (!this.verifyMessage(message)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because the signature verification failed` });
            return false;
        }

        if (view > newView) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${newView}], onReceiveViewChange from "${senderPk}", ignored because of unrelated view` });
            return false;
        }

        if (preparedProof && validatePreparedProof(this.term, newView, preparedProof, this.getF(), this.keyManager, this.termMembersPKs, (view: number) => this.calcLeaderPk(view)) === false) {
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
            const viewChangeMessages = this.pbftStorage.getViewChangeMessages(term, view, this.getF());
            if (viewChangeMessages) {
                this.onElected(view, viewChangeMessages);
            }
        }
    }

    private async onElected(view: number, viewChangeMessages: ViewChangeMessage[]) {
        this.logger.log({ subject: "Flow", FlowType: "Elected", term: this.term, view });
        this.newViewLocally = view;
        this.setView(view);
        let block: Block = getLatestBlockFromViewChangeMessages(viewChangeMessages);
        if (!block) {
            block = await this.blockUtils.requestNewBlock(this.term);
            if (this.disposed) {
                return;
            }
        }

        const preprepareMessage: PrePrepareMessage = this.messagesFactory.createPreprepareMessage(this.term, view, block);
        const viewChangeVotes: ViewChangeVote[] = viewChangeMessages.map(vc => ({ content: vc.content, signaturePair: vc.signaturePair }));
        const newViewMessage: NewViewMessage = this.messagesFactory.createNewViewMessage(this.term, view, preprepareMessage, viewChangeVotes);
        this.pbftStorage.storePrePrepare(preprepareMessage);
        this.sendNewView(newViewMessage);
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
        const message: CommitMessage = this.messagesFactory.createCommitMessage(term, view, blockHash);
        this.pbftStorage.storeCommit(message);
        this.sendCommit(message);
        this.checkCommitted(term, view, blockHash);
    }

    public onReceiveCommit(message: CommitMessage): void {
        const { content, signaturePair } = message;
        const { signerPublicKey: senderPk } = signaturePair;
        const { view, term, blockHash } = content;

        if (!this.verifyMessage(message)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveCommit from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        this.pbftStorage.storeCommit(message);
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

    private validateViewChangeVotes(targetTerm: number, targetView: number, votes: ViewChangeVote[]): boolean {
        if (!votes || !Array.isArray(votes)) {
            return false;
        }

        if (votes.length < this.getF() * 2 + 1) {
            return false;
        }

        const allMatchTargetTerm = votes.every(viewChangeMessage => viewChangeMessage.content.term === targetTerm);
        if (!allMatchTargetTerm) {
            return false;
        }

        const allMatchTargetView = votes.every(viewChangeMessage => viewChangeMessage.content.view === targetView);
        if (!allMatchTargetView) {
            return false;
        }

        const allPkAreUnique = votes.reduce((prev, current) => prev.set(current.signaturePair.signerPublicKey, true), new Map()).size === votes.length;
        if (!allPkAreUnique) {
            return false;
        }

        return true;
    }

    private latestViewChangeVote(votes: ViewChangeVote[]): ViewChangeVote {
        const filteredVotes = votes
            .filter(vote => vote.content.preparedProof !== undefined)
            .sort((a, b) => b.content.preparedProof.preprepareBlockRefMessage.content.view - a.content.preparedProof.preprepareBlockRefMessage.content.view);

        if (filteredVotes.length > 0) {
            return filteredVotes[0];
        } else {
            return undefined;
        }
    }

    public async onReceiveNewView(message: NewViewMessage): Promise<void> {
        const { content, signaturePair, preprepareMessage } = message;
        const { signerPublicKey: senderPk } = signaturePair;
        const { view, term, votes } = content;

        if (!this.verifyMessage(message)) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", ignored because the signature verification failed` });
            return;
        }

        const futureLeaderId = this.calcLeaderPk(view);
        if (futureLeaderId !== senderPk) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", rejected because it match the new id (${view})` });
            return;
        }

        if (this.validateViewChangeVotes(term, view, votes) === false) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", votes is invalid` });
            return;
        }

        if (this.view > view) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view is from the past` });
            return;
        }

        if (view !== preprepareMessage.content.view) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view doesn't match PP.view` });
            return;
        }

        if (term !== preprepareMessage.content.term) {
            this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", term doesn't match PP.term` });
            return;
        }

        const latestVote: ViewChangeVote = this.latestViewChangeVote(votes);
        if (latestVote !== undefined) {
            const viewChangeMessageValid = this.isViewChangeValid(futureLeaderId, view, latestVote);
            if (!viewChangeMessageValid) {
                this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", view change votes are invalid` });
                return;
            }

            const latestVoteBlockHash = latestVote.content.preparedProof && latestVote.content.preparedProof.preprepareBlockRefMessage.content.blockHash;
            if (latestVoteBlockHash) {
                const ppBlockHash = this.blockUtils.calculateBlockHash(preprepareMessage.block);
                if (latestVoteBlockHash.equals(ppBlockHash) === false) {
                    this.logger.log({ subject: "Warning", message: `term:[${term}], view:[${view}], onReceiveNewView from "${senderPk}", the given block (PP.block) doesn't match the best block from the VCProof` });
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
        this.electionTrigger.unregisterOnTrigger();
        this.onCommittedBlock(block);
    }
}