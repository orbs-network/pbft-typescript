import { Block } from "../Block";
import { Logger } from "../logger/Logger";
import { CommitMessage, PreparedProof, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../networkCommunication/Messages";
import { PBFTStorage, Prepared } from "./PBFTStorage";

type TermViewMap<V> = Map<number, Map<number, V>>;

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: TermViewMap<PrePrepareMessage>;
    private prepareStorage: TermViewMap<Map<string, Map<string, PrepareMessage>>>;
    private commitStorage: TermViewMap<Map<string, Map<string, CommitMessage>>>;
    private viewChangeStorage: TermViewMap<Map<string, ViewChangeMessage>>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(term: number, view: number, message: PrePrepareMessage): boolean {
        let viewsMap = this.prePrepareStorage.get(term);
        if (!viewsMap) {
            viewsMap = new Map();
            this.prePrepareStorage.set(term, viewsMap);
        }

        if (viewsMap.get(view) !== undefined) {
            return false;
        }
        viewsMap.set(view, message);
        const { signerPublicKey: senderPk } = message.signaturePair;
        const { blockHash } = message.content;
        this.logger.log({ subject: "Storage", StorageType: "PrePrepare", term, view, senderPk, blockHash: blockHash.toString("hex") });
        return true;
    }

    getPrePrepareBlock(term: number, view: number): Block {
        const prePrepareMessage: PrePrepareMessage = this.getPrePrepareMessage(term, view);
        if (prePrepareMessage) {
            return prePrepareMessage.block;
        }
    }

    getPrePrepareMessage(term: number, view: number): PrePrepareMessage {
        const viewsMap = this.prePrepareStorage.get(term);
        if (viewsMap) {
            return viewsMap.get(view);
        }
    }

    storePrepare(term: number, view: number, message: PrepareMessage): boolean {
        let viewsMap = this.prepareStorage.get(term);
        if (!viewsMap) {
            viewsMap = new Map();
            this.prepareStorage.set(term, viewsMap);
        }

        let blockHashesMap = viewsMap.get(view);
        if (!blockHashesMap) {
            blockHashesMap = new Map();
            viewsMap.set(view, blockHashesMap);
        }

        const { blockHash } = message.content;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { signerPublicKey: senderPk } = message.signaturePair;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "Prepare", term, view, senderPk, blockHash: key });
        return true;
    }

    private getPrepare(term: number, view: number, blockHash: Buffer): Map<string, PrepareMessage> {
        const viewsMap = this.prepareStorage.get(term);
        if (viewsMap) {
            const blockHashesMap = viewsMap.get(view);
            if (blockHashesMap) {
                const blockHashKey = blockHash.toString("hex");
                const sendersMap = blockHashesMap.get(blockHashKey);
                return sendersMap;
            }
        }
    }

    getPrepareSendersPks(term: number, view: number, blockHash: Buffer): string[] {
        const sendersMap = this.getPrepare(term, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.keys());
        }

        return [];
    }

    getPrepareMessages(term: number, view: number, blockHash: Buffer): PrepareMessage[] {
        const sendersMap = this.getPrepare(term, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.values());
        }

        return [];
    }

    private getLatestPrePrepareView(term: number): number {
        const termsMap = this.prePrepareStorage.get(term);
        if (termsMap) {
            const views = Array.from(termsMap.keys());
            if (views.length > 0) {
                const lastView = views.sort()[views.length - 1];
                return lastView;
            }
        }
    }

    getLatestPrepared(term: number, f: number): Prepared {
        const lastView = this.getLatestPrePrepareView(term);
        if (lastView !== undefined) {
            const preprepareMessage: PrePrepareMessage = this.getPrePrepareMessage(term, lastView);
            if (preprepareMessage) {
                const prepareMessages: PrepareMessage[] = this.getPrepareMessages(term, lastView, preprepareMessage.content.blockHash);
                if (prepareMessages.length >= f * 2) {
                    return { preprepareMessage, prepareMessages };
                }
            }
        }
    }

    storeCommit(term: number, view: number, message: CommitMessage): boolean {
        let viewsMap = this.commitStorage.get(term);
        if (!viewsMap) {
            viewsMap = new Map();
            this.commitStorage.set(term, viewsMap);
        }

        let blockHashesMap = viewsMap.get(view);
        if (!blockHashesMap) {
            blockHashesMap = new Map();
            viewsMap.set(view, blockHashesMap);
        }

        const { blockHash } = message.content;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { signerPublicKey: senderPk } = message.signaturePair;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "Commit", term, view, senderPk, blockHash: key });
        return true;
    }

    private getCommit(term: number, view: number, blockHash: Buffer): Map<string, CommitMessage> {
        const viewsMap = this.commitStorage.get(term);
        if (viewsMap) {
            const blockHashesMap = viewsMap.get(view);
            if (blockHashesMap) {
                const blockHashKey = blockHash.toString("hex");
                const sendersMap = blockHashesMap.get(blockHashKey);
                return sendersMap;
            }
        }
    }

    getCommitSendersPks(term: number, view: number, blockHash: Buffer): string[] {
        const sendersMap = this.getCommit(term, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.keys());
        }

        return [];
    }

    getCommitMessages(term: number, view: number, blockHash: Buffer): CommitMessage[] {
        const sendersMap = this.getCommit(term, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.values());
        }

        return [];
    }

    storeViewChange(term: number, view: number, message: ViewChangeMessage): boolean {
        let viewsMap = this.viewChangeStorage.get(term);
        if (!viewsMap) {
            viewsMap = new Map();
            this.viewChangeStorage.set(term, viewsMap);
        }

        let sendersMap = viewsMap.get(view);
        if (!sendersMap) {
            sendersMap = new Map();
            viewsMap.set(view, sendersMap);
        }

        const { signerPublicKey: senderPk } = message.signaturePair;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "ViewChange", senderPk, term, view });
        return true;
    }

    getViewChangeMessages(term: number, view: number, f: number): ViewChangeMessage[] {
        const viewsMap = this.viewChangeStorage.get(term);
        if (viewsMap) {
            const sendersMap = viewsMap.get(view);
            const minimumNodes = f * 2 + 1;
            if (sendersMap && sendersMap.size >= minimumNodes) {
                return Array.from(sendersMap.values()).slice(0, minimumNodes);
            }
        }
    }

    clearTermLogs(term: number): void {
        this.prePrepareStorage.delete(term);
        this.prepareStorage.delete(term);
        this.commitStorage.delete(term);
        this.viewChangeStorage.delete(term);
        this.logger.log({ subject: "Storage", StorageType: "ClearTerm", term });
    }
}