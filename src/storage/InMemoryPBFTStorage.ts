import { Logger } from "../logger/Logger";
import { PBFTStorage } from "./PBFTStorage";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prePrepareStorage: { [blockHash: string]: boolean } = {};
    private prepareStorage: { [blockHash: string]: string[] } = {};
    private viewChangeStorage: { [view: number]: string[] } = {};

    constructor(private logger: Logger) {
        this.prePrepareStorage = {};
        this.prepareStorage = {};
        this.viewChangeStorage = {};
    }

    storePrePrepare(blockHash: string): void {
        this.prePrepareStorage[blockHash] = true;
        this.logger.log(`storePrePrepare, block logged.`);
    }

    hasPrePrepare(blockHash: string): boolean {
        return this.prePrepareStorage[blockHash] === true;
    }

    storePrepare(blockHash: string, senderId: string): void {
        if (this.prepareStorage[blockHash] === undefined) {
            this.prepareStorage[blockHash] = [senderId];
        } else {
            if (this.prepareStorage[blockHash].indexOf(senderId) === -1) {
                this.prepareStorage[blockHash].push(senderId);
            }
        }
        this.logger.log(`storePrepare, block logged. [${this.countOfPrepared(blockHash)}] votes so far.`);
    }

    countOfPrepared(blockHash: string): number {
        return this.prepareStorage[blockHash] !== undefined ? this.prepareStorage[blockHash].length : 0;
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