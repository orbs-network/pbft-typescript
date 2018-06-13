import { Logger } from "../logger/Logger";
import { PBFTStorage } from "./PBFTStorage";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: Map<string, string>;
    private prepareStorage: Map<string, string[]>;
    private commitStorage: Map<string, string[]>;
    private viewChangeStorage: Map<number, string[]>;

    constructor(private logger: Logger) {
        this.prePrepareStorage = new Map();
        this.prepareStorage = new Map();
        this.commitStorage = new Map();
        this.viewChangeStorage = new Map();
    }

    storePrePrepare(term: number, view: number, blockHash: string): void {
        const key = term.toString() + "_" + view.toString();
        this.prePrepareStorage.set(key, blockHash);
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storePrePrepare`);
    }

    getPrePrepare(term: number, view: number): string {
        const key = term.toString() + "_" + view.toString();
        return this.prePrepareStorage.get(key);
    }

    storePrepare(term: number, view: number, senderId: string, blockHash: string): void {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash;
        const prepares = this.prepareStorage.get(key);
        if (prepares) {
            if (prepares.indexOf(senderId) === -1) {
                prepares.push(senderId);
            }
        } else {
            this.prepareStorage.set(key, [senderId]);
        }
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storePrepare from "${senderId}". ${this.getPrepare(term, view, blockHash).length} votes so far.`);
    }

    getPrepare(term: number, view: number, blockHash: string): string[] {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash;
        return this.prepareStorage.get(key) || [];
    }

    storeCommit(term: number, view: number, senderId: string, blockHash: string): void {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash;
        const commits = this.commitStorage.get(key);
        if (commits) {
            if (commits.indexOf(senderId) === -1) {
                commits.push(senderId);
            }
        } else {
            this.commitStorage.set(key, [senderId]);
        }
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storeCommit from "${senderId}". ${this.getCommit(term, view, blockHash).length} votes so far.`);
    }

    getCommit(term: number, view: number, blockHash: string): string[] {
        const key = term.toString() + "_" + view.toString() + "_" + blockHash;
        return this.commitStorage.get(key) || [];
    }

    storeViewChange(view: number, senderId: string): void {
        const senders = this.viewChangeStorage.get(view);
        if (senders) {
            if (senders.indexOf(senderId) === -1) {
                senders.push(senderId);
            }
        } else {
            this.viewChangeStorage.set(view, [senderId]);
        }
        this.logger.log(`view:[${view}], storeViewChange, from "${senderId}". ${this.countOfViewChange(view)} votes so far.`);
    }

    countOfViewChange(view: number): number {
        const viewChanges = this.viewChangeStorage.get(view) || [];
        return viewChanges.length;
    }
}