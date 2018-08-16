import { Block } from "../Block";
import { Logger } from "../logger/Logger";
import { CommitPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "../networkCommunication/Payload";
import { PBFTStorage, PreparedProof } from "./PBFTStorage";

type TermViewMap<V> = Map<number, Map<number, V>>;

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: TermViewMap<PrePreparePayload>;
    private prepareStorage: TermViewMap<Map<string, Map<string, PreparePayload>>>;
    private commitStorage: TermViewMap<Map<string, Map<string, CommitPayload>>>;
    private viewChangeStorage: TermViewMap<Map<string, ViewChangePayload>>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(term: number, view: number, payload: PrePreparePayload): boolean {
        let viewsMap = this.prePrepareStorage.get(term);
        if (!viewsMap) {
            viewsMap = new Map();
            this.prePrepareStorage.set(term, viewsMap);
        }

        if (viewsMap.get(view) !== undefined) {
            return false;
        }
        viewsMap.set(view, payload);
        const { pk: senderPk } = payload;
        const { blockHash } = payload.data;
        this.logger.log({ subject: "Storage", StorageType: "PrePrepare", term, view, senderPk, blockHash: blockHash.toString("hex") });
        return true;
    }

    getPrePrepareBlock(term: number, view: number): Block {
        const prePreparePayload: PrePreparePayload = this.getPrePreparePayload(term, view);
        if (prePreparePayload) {
            return prePreparePayload.block;
        }
    }

    getPrePreparePayload(term: number, view: number): PrePreparePayload {
        const viewsMap = this.prePrepareStorage.get(term);
        if (viewsMap) {
            return viewsMap.get(view);
        }
    }

    storePrepare(term: number, view: number, payload: PreparePayload): boolean {
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

        const { blockHash } = payload.data;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { pk: senderPk } = payload;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ subject: "Storage", StorageType: "Prepare", term, view, senderPk, blockHash: key });
        return true;
    }

    private getPrepare(term: number, view: number, blockHash: Buffer): Map<string, PreparePayload> {
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

    getPreparePayloads(term: number, view: number, blockHash: Buffer): PreparePayload[] {
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

    getLatestPreparedProof(term: number, f: number): PreparedProof {
        const lastView = this.getLatestPrePrepareView(term);
        if (lastView !== undefined) {
            const prepreparePayload: PrePreparePayload = this.getPrePreparePayload(term, lastView);
            if (prepreparePayload) {
                const preparePayloads: PreparePayload[] = this.getPreparePayloads(term, lastView, prepreparePayload.data.blockHash);
                if (preparePayloads.length >= f * 2) {
                    return {
                        prepreparePayload,
                        preparePayloads
                    };
                }
            }
        }
    }

    storeCommit(term: number, view: number, payload: CommitPayload): boolean {
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

        const { blockHash } = payload.data;
        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        const { pk: senderPk } = payload;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ subject: "Storage", StorageType: "Commit", term, view, senderPk, blockHash: key });
        return true;
    }

    private getCommit(term: number, view: number, blockHash: Buffer): Map<string, CommitPayload> {
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

    getCommitPayloads(term: number, view: number, blockHash: Buffer): CommitPayload[] {
        const sendersMap = this.getCommit(term, view, blockHash);
        if (sendersMap) {
            return Array.from(sendersMap.values());
        }

        return [];
    }

    storeViewChange(term: number, view: number, payload: ViewChangePayload): boolean {
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

        const { pk: senderPk } = payload;
        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ subject: "Storage", StorageType: "ViewChange", senderPk, term, view });
        return true;
    }

    getViewChangeProof(term: number, view: number, f: number): ViewChangePayload[] {
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