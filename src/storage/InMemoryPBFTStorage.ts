import { PBFTStorage } from "./PBFTStorage";

export class InMemoryPBFTStorage implements PBFTStorage {
    private prepareStorage: { [blockHash: string]: string[] } = {};
    private viewChangeStorage: { [view: number]: string[] } = {};

    constructor() {
        this.prepareStorage = {};
        this.viewChangeStorage = {};
    }

    storePrepare(blockHash: string, senderPublicKey: string): void {
        if (this.prepareStorage[blockHash] === undefined) {
            this.prepareStorage[blockHash] = [senderPublicKey];
        } else {
            if (this.prepareStorage[blockHash].indexOf(senderPublicKey) === -1) {
                this.prepareStorage[blockHash].push(senderPublicKey);
            }
        }
    }

    countOfPrepared(blockHash: string): number {
        return this.prepareStorage[blockHash] !== undefined ? this.prepareStorage[blockHash].length : 0;
    }

    storeViewChange(view: number, senderPublicKey: string): void {
        if (this.viewChangeStorage[view] === undefined) {
            this.viewChangeStorage[view] = [senderPublicKey];
        } else {
            if (this.viewChangeStorage[view].indexOf(senderPublicKey) === -1) {
                this.viewChangeStorage[view].push(senderPublicKey);
            }
        }
    }

    countOfViewChange(view: number): number {
        return this.viewChangeStorage[view] !== undefined ? this.viewChangeStorage[view].length : 0;
    }
}