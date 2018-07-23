import { Logger } from "../logger/Logger";
import { PBFTStorage, PreparedProof } from "./PBFTStorage";
import { Block } from "../Block";
import { PrePreparePayload, PreparePayload, CommitPayload } from "../networkCommunication/Payload";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: Map<string, Block>;
    private prepareStorage: Map<string, string[]>;
    private commitStorage: Map<string, string[]>;
    private viewChangeStorage: Map<string, string[]>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(term: number, view: number, block: Block, payload: PrePreparePayload): boolean {
        const key = term.toString() + "_" + view.toString();
        if (this.prePrepareStorage.get(key) !== undefined) {
            return false;
        }
        this.prePrepareStorage.set(key, block);
        this.logger.log({ Subject: "Storage", StorageType: "PrePrepare", term, view, block });
        return true;
    }

    getPrePrepare(term: number, view: number): Block {
        const key = term.toString() + "_" + view.toString();
        return this.prePrepareStorage.get(key);
    }

    storePrepare(term: number, view: number, blockHash: Buffer, senderPk: string, payload: PreparePayload): boolean {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash.toString("hex");
        const prepares = this.prepareStorage.get(key);
        if (prepares) {
            if (prepares.indexOf(senderPk) === -1) {
                prepares.push(senderPk);
            } else {
                return false;
            }
        } else {
            this.prepareStorage.set(key, [senderPk]);
        }
        this.logger.log({ Subject: "Storage", StorageType: "Prepare", term, view, blockHash, senderPk });
        return true;
    }

    getPrepare(term: number, view: number, blockHash: Buffer): string[] {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash.toString("hex");
        return this.prepareStorage.get(key) || [];
    }

    getLatestPreparedProff(term: number): PreparedProof {
        return undefined;
    }

    storeCommit(term: number, view: number, blockHash: Buffer, senderPk: string, payload: CommitPayload): boolean {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash.toString("hex");
        const commits = this.commitStorage.get(key);
        if (commits) {
            if (commits.indexOf(senderPk) === -1) {
                commits.push(senderPk);
            } else {
                return false;
            }
        } else {
            this.commitStorage.set(key, [senderPk]);
        }
        this.logger.log({ Subject: "Storage", StorageType: "Commit", term, view, blockHash, senderPk });
        return true;
    }

    getCommit(term: number, view: number, blockHash: Buffer): string[] {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash.toString("hex");
        return this.commitStorage.get(key) || [];
    }

    storeViewChange(term: number, view: number, senderPk: string): boolean {
        const key = term.toString() + "_" + view.toString();
        const senders = this.viewChangeStorage.get(key);
        if (senders) {
            if (senders.indexOf(senderPk) === -1) {
                senders.push(senderPk);
            } else {
                return false;
            }
        } else {
            this.viewChangeStorage.set(key, [senderPk]);
        }
        this.logger.log({ Subject: "Storage", StorageType: "ViewChange", term, view, senderPk });
        return true;
    }

    countOfViewChange(term: number, view: number): number {
        const key = term.toString() + "_" + view.toString();
        const viewChanges = this.viewChangeStorage.get(key) || [];
        return viewChanges.length;
    }
}