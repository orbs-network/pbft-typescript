export interface PBFTStorage {
    storePrepare(blockHash: string, senderId: string): void;
    countOfPrepared(blockHash: string): number;
    storeViewChange(view: number, senderId: string): void;
    countOfViewChange(view: number): number;
}