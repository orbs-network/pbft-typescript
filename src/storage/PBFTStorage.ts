export interface PBFTStorage {
    storePrePrepare(blockHash: string): void;
    hasPrePrepare(blockHash: string): boolean;
    storePrepare(blockHash: string, senderId: string): void;
    countOfPrepared(blockHash: string): number;
    storeViewChange(view: number, senderId: string): void;
    countOfViewChange(view: number): number;
}