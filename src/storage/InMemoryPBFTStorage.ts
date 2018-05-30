import { Logger } from "../logger/Logger";
import { PBFTStorage } from "./PBFTStorage";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: { [term: number]: string } = {};
    private prepareStorage: { [term: number]: Array<{ senderId: string, blockHash: string }> } = {};
    private viewChangeStorage: { [view: number]: string[] } = {};

    constructor(private logger: Logger) {
        this.prePrepareStorage = {};
        this.prepareStorage = {};
        this.viewChangeStorage = {};
    }

    storePrePrepare(term: number, blockHash: string): void {
        this.prePrepareStorage[term] = blockHash;
        this.logger.log(`storePrePrepare, term [${term}] logged.`);
    }

    getPrePrepare(term: number): string {
        return this.prePrepareStorage[term];
    }

    storePrepare(term: number, senderId: string, blockHash: string): void {
        if (this.prepareStorage[term] === undefined) {
            this.prepareStorage[term] = [{ senderId, blockHash }];
        } else {
            if (this.prepareStorage[term].filter(i => i.senderId === senderId).length === 0 ) {
                this.prepareStorage[term].push({ senderId, blockHash });
            }
        }
        this.logger.log(`storePrepare from [${senderId}], term [${term}] logged. [${Object.keys(this.prepareStorage).map(k => parseInt(k, 10)).map(k => this.prepareStorage[k])}] votes so far.`);
    }

    getPrepare(term: number): Array<{ senderId: string, blockHash: string }> {
        return this.prepareStorage[term] !== undefined ? this.prepareStorage[term] : [];
    }

    storeViewChange(view: number, senderId: string): void {
        if (this.viewChangeStorage[view] === undefined) {
            this.viewChangeStorage[view] = [senderId];
        } else {
            if (this.viewChangeStorage[view].indexOf(senderId) === -1) {
                this.viewChangeStorage[view].push(senderId);
            }
        }
        this.logger.log(`storeViewChange, view change logged. [${this.countOfViewChange(view)}] votes so far.`);
    }

    countOfViewChange(view: number): number {
        return this.viewChangeStorage[view] !== undefined ? this.viewChangeStorage[view].length : 0;
    }
}