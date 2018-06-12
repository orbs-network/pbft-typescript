import { Logger } from "../logger/Logger";
import { PBFTStorage } from "./PBFTStorage";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: { [key: string]: string } = {};
    private prepareStorage: { [key: string]: Array<{ senderId: string, blockHash: string }> } = {};
    private commitStorage: { [key: string]: Array<{ senderId: string, blockHash: string }> } = {};
    private viewChangeStorage: { [view: number]: string[] } = {};

    constructor(private logger: Logger) {
        this.prePrepareStorage = {};
        this.prepareStorage = {};
        this.commitStorage = {};
        this.viewChangeStorage = {};
    }

    storePrePrepare(term: number, view: number, blockHash: string): void {
        const key = term.toString() + "_" + view.toString();
        this.prePrepareStorage[key] = blockHash;
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storePrePrepare`);
    }

    getPrePrepare(term: number, view: number): string {
        const key = term.toString() + "_" + view.toString();
        return this.prePrepareStorage[key];
    }

    storePrepare(term: number, view: number, senderId: string, blockHash: string): void {
        const key = term.toString() + "_" + view.toString();
        if (this.prepareStorage[key] === undefined) {
            this.prepareStorage[key] = [{ senderId, blockHash }];
        } else {
            if (this.prepareStorage[key].filter(i => i.senderId === senderId).length === 0) {
                this.prepareStorage[key].push({ senderId, blockHash });
            }
        }
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storePrepare from "${senderId}". ${this.getPrepare(term, view, blockHash).length} votes so far.`);
    }

    getPrepare(term: number, view: number, blockHash: string): string[] {
        const key = term.toString() + "_" + view.toString();
        const prepares = this.prepareStorage[key] !== undefined ? this.prepareStorage[key] : [];
        return prepares.filter(p => p.blockHash === blockHash).map(p => p.senderId);
    }

    storeCommit(term: number, view: number, senderId: string, blockHash: string): void {
        const key = term.toString() + "_" + view.toString();
        if (this.commitStorage[key] === undefined) {
            this.commitStorage[key] = [{ senderId, blockHash }];
        } else {
            if (this.commitStorage[key].filter(i => i.senderId === senderId).length === 0) {
                this.commitStorage[key].push({ senderId, blockHash });
            }
        }
        this.logger.log(`term:[${term}], view:[${view}], blockHash:[${blockHash}], storeCommit from "${senderId}". ${this.getCommit(term, view, blockHash).length} votes so far.`);
    }

    getCommit(term: number, view: number, blockHash: string): string[] {
        const key = term.toString() + "_" + view.toString();
        const commits = this.commitStorage[key] !== undefined ? this.commitStorage[key] : [];
        return commits.filter(c => c.blockHash === blockHash).map(c => c.senderId);
    }

    storeViewChange(view: number, senderId: string): void {
        if (this.viewChangeStorage[view] === undefined) {
            this.viewChangeStorage[view] = [senderId];
        } else {
            if (this.viewChangeStorage[view].indexOf(senderId) === -1) {
                this.viewChangeStorage[view].push(senderId);
            }
        }
        this.logger.log(`view:[${view}], storeViewChange, from "${senderId}". ${this.countOfViewChange(view)} votes so far.`);
    }

    countOfViewChange(view: number): number {
        return this.viewChangeStorage[view] !== undefined ? this.viewChangeStorage[view].length : 0;
    }
}