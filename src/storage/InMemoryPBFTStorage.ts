import { Block } from "../Block";
import { Logger } from "../logger/Logger";
import { CommitMessage, PreparedProof, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../networkCommunication/Messages";
import { PBFTStorage, PreparedMessages } from "./PBFTStorage";

type BlockHeightToViewMap<V> = Map<number, Map<number, V>>;

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: BlockHeightToViewMap<PrePrepareMessage>;
    private prepareStorage: BlockHeightToViewMap<Map<string, Map<string, PrepareMessage>>>;
    private commitStorage: BlockHeightToViewMap<Map<string, Map<string, CommitMessage>>>;
    private viewChangeStorage: BlockHeightToViewMap<Map<string, ViewChangeMessage>>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(message: PrePrepareMessage): boolean {
        const { blockHeight, view } = message.signedHeader;
        let viewsMap = this.prePrepareStorage.get(blockHeight);
        if (!viewsMap) {
            viewsMap = new Map();
            this.prePrepareStorage.set(blockHeight, viewsMap);
        }

        if (viewsMap.get(view) !== undefined) {
            return false;
        }
        viewsMap.set(view, message);
        const { senderPublicKey: senderPk } = message.sender;
        const { blockHash } = message.signedHeader;
        this.logger.log({ subject: "Storage", StorageType: "PrePrepare", blockHeight, view, senderPk, blockHash: blockHash.toString("hex") });
        return true;
    }

    getPrePrepareBlock(blockHeight: number, view: number): Block {
        const prePrepareMessage: PrePrepareMessage = this.getPrePrepareMessage(blockHeight, view);
        if (prePrepareMessage) {
            return prePrepareMessage.block;
        }
    }

    getPrePrepareMessage(blockHeight: number, view: number): PrePrepareMessage {
        const viewsMap = this.prePrepareStorage.get(blockHeight);
        if (viewsMap) {
            return viewsMap.get(view);
        }
    }

    storePrepare(message: PrepareMessage): boolean {
        const { blockHeight, view } = message.signedHeader;
        let viewsMap = this.prepareStorage.get(blockHeight);
        if (!viewsMap) {
            viewsMap = new Map();
            this.prepareStorage.set(blockHeight, viewsMap);
        }

        let blockHashesMap = viewsMap.get(view);
        if (!blockHashesMap) {
            blockHashesMap = new Map();
            viewsMap.set(view, blockHashesMap);
        }

        const { blockHash } = message.signedHeader;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { senderPublicKey: senderPk } = message.sender;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "Prepare", blockHeight, view, senderPk, blockHash: key });
        return true;
    }

    private getPrepare(blockHeight: number, view: number, blockHash: Buffer): Map<string, PrepareMessage> {
        const viewsMap = this.prepareStorage.get(blockHeight);
        if (viewsMap) {
            const blockHashesMap = viewsMap.get(view);
            if (blockHashesMap) {
                const blockHashKey = blockHash.toString("hex");
                const sendersMap = blockHashesMap.get(blockHashKey);
                return sendersMap;
            }
        }
    }

    getPrepareSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[] {
        const sendersMap = this.getPrepare(blockHeight, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.keys());
        }

        return [];
    }

    getPrepareMessages(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage[] {
        const sendersMap = this.getPrepare(blockHeight, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.values());
        }

        return [];
    }

    private getLatestPrePrepareView(blockHeight: number): number {
        const blockHeightMap = this.prePrepareStorage.get(blockHeight);
        if (blockHeightMap) {
            const views = Array.from(blockHeightMap.keys());
            if (views.length > 0) {
                const lastView = views.sort()[views.length - 1];
                return lastView;
            }
        }
    }

    getLatestPrepared(blockHeight: number, f: number): PreparedMessages {
        const lastView = this.getLatestPrePrepareView(blockHeight);
        if (lastView !== undefined) {
            const preprepareMessage: PrePrepareMessage = this.getPrePrepareMessage(blockHeight, lastView);
            if (preprepareMessage) {
                const prepareMessages: PrepareMessage[] = this.getPrepareMessages(blockHeight, lastView, preprepareMessage.signedHeader.blockHash);
                if (prepareMessages.length >= f * 2) {
                    return { preprepareMessage, prepareMessages };
                }
            }
        }
    }

    storeCommit(message: CommitMessage): boolean {
        const { blockHeight, view } = message.signedHeader;
        let viewsMap = this.commitStorage.get(blockHeight);
        if (!viewsMap) {
            viewsMap = new Map();
            this.commitStorage.set(blockHeight, viewsMap);
        }

        let blockHashesMap = viewsMap.get(view);
        if (!blockHashesMap) {
            blockHashesMap = new Map();
            viewsMap.set(view, blockHashesMap);
        }

        const { blockHash } = message.signedHeader;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { senderPublicKey: senderPk } = message.sender;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "Commit", blockHeight, view, senderPk, blockHash: key });
        return true;
    }

    private getCommit(blockHeight: number, view: number, blockHash: Buffer): Map<string, CommitMessage> {
        const viewsMap = this.commitStorage.get(blockHeight);
        if (viewsMap) {
            const blockHashesMap = viewsMap.get(view);
            if (blockHashesMap) {
                const blockHashKey = blockHash.toString("hex");
                const sendersMap = blockHashesMap.get(blockHashKey);
                return sendersMap;
            }
        }
    }

    getCommitSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[] {
        const sendersMap = this.getCommit(blockHeight, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.keys());
        }

        return [];
    }

    getCommitMessages(blockHeight: number, view: number, blockHash: Buffer): CommitMessage[] {
        const sendersMap = this.getCommit(blockHeight, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.values());
        }

        return [];
    }

    storeViewChange(message: ViewChangeMessage): boolean {
        const { blockHeight, view } = message.signedHeader;
        let viewsMap = this.viewChangeStorage.get(blockHeight);
        if (!viewsMap) {
            viewsMap = new Map();
            this.viewChangeStorage.set(blockHeight, viewsMap);
        }

        let sendersMap = viewsMap.get(view);
        if (!sendersMap) {
            sendersMap = new Map();
            viewsMap.set(view, sendersMap);
        }

        const { senderPublicKey: senderPk } = message.sender;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, message);

        this.logger.log({ subject: "Storage", StorageType: "ViewChange", senderPk, blockHeight, view });
        return true;
    }

    getViewChangeMessages(blockHeight: number, view: number, f: number): ViewChangeMessage[] {
        const viewsMap = this.viewChangeStorage.get(blockHeight);
        if (viewsMap) {
            const sendersMap = viewsMap.get(view);
            const minimumNodes = f * 2 + 1;
            if (sendersMap && sendersMap.size >= minimumNodes) {
                return Array.from(sendersMap.values()).slice(0, minimumNodes);
            }
        }
    }

    clearBlockHeightLogs(blockHeight: number): void {
        this.prePrepareStorage.delete(blockHeight);
        this.prepareStorage.delete(blockHeight);
        this.commitStorage.delete(blockHeight);
        this.viewChangeStorage.delete(blockHeight);
        this.logger.log({ subject: "Storage", StorageType: "ClearHeight", blockHeight });
    }
}