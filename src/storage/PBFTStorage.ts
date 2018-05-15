export interface PBFTStorage {
    storePrepare(blockHash: string, senderPublicKey: string): void;
    countOfPrepared(blockHash: string): number;
    storeViewChange(view: number, senderPublicKey: string): void;
    countOfViewChange(view: number): number;
}