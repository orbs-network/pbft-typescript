import { Block } from "../Block";
import { Logger } from "../logger/Logger";
import { CommitPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "../networkCommunication/Payload";
import { PBFTStorage, PreparedProof } from "./PBFTStorage";

interface PrePrepareStore {
    block: Block;
    payload: PrePreparePayload;
}

type TermViewMap<V> = Map<number, Map<number, V>>;

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: TermViewMap<PrePrepareStore>;
    private prepareStorage: TermViewMap<Map<string, Map<string, PreparePayload>>>;
    private commitStorage: TermViewMap<Map<string, Map<string, CommitPayload>>>;
    private viewChangeStorage: TermViewMap<Map<string, ViewChangePayload>>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(term: number, view: number, block: Block, payload: PrePreparePayload): boolean {
        let termsMap = this.prePrepareStorage.get(term);
        if (!termsMap) {
            termsMap = new Map();
            this.prePrepareStorage.set(term, termsMap);
        }

        if (termsMap.get(view) !== undefined) {
            return false;
        }
        termsMap.set(view, { block, payload });
        this.logger.log({ Subject: "Storage", StorageType: "PrePrepare", term, view, block });
        return true;
    }

    private getPrePrepare(term: number, view: number): PrePrepareStore {
        const viewsMap = this.prePrepareStorage.get(term);
        if (viewsMap) {
            return viewsMap.get(view);
        }
    }

    getPrePrepareBlock(term: number, view: number): Block {
        const prePrepareStore: PrePrepareStore = this.getPrePrepare(term, view);
        if (prePrepareStore) {
            return prePrepareStore.block;
        }
    }

    getPrePreparePayload(term: number, view: number): PrePreparePayload {
        const prePrepareStore: PrePrepareStore = this.getPrePrepare(term, view);
        if (prePrepareStore) {
            return prePrepareStore.payload;
        }
    }

    storePrepare(term: number, view: number, blockHash: Buffer, senderPk: string, payload: PreparePayload): boolean {
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

        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ Subject: "Storage", StorageType: "Prepare", term, view, blockHash, senderPk });
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

    storeCommit(term: number, view: number, blockHash: Buffer, senderPk: string, payload: CommitPayload): boolean {
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

        const key = blockHash.toString("hex");
        let sendersMap = blockHashesMap.get(key);
        if (!sendersMap) {
            sendersMap = new Map();
            blockHashesMap.set(key, sendersMap);
        }

        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ Subject: "Storage", StorageType: "Commit", term, view, blockHash, senderPk });
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

    storeViewChange(term: number, view: number, senderPk: string, payload: ViewChangePayload): boolean {
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

        if (sendersMap.get(senderPk) !== undefined) {
            return false;
        }
        sendersMap.set(senderPk, payload);

        this.logger.log({ Subject: "Storage", StorageType: "ViewChange", term, view, senderPk });
        return true;
    }

    getViewChangeProof(term: number, view: number, f: number): ViewChangePayload[] {
        const viewsMap = this.viewChangeStorage.get(term);
        if (viewsMap) {
            const sendersMap = viewsMap.get(view);
            if (sendersMap && sendersMap.size >= (f * 2 + 1)) {
                return Array.from(sendersMap.values());
            }
        }

        return [];
    }

    clearTermLogs(term: number): void {
        this.prePrepareStorage.delete(term);
        this.prepareStorage.delete(term);
        this.commitStorage.delete(term);
        this.viewChangeStorage.delete(term);
    }
}