//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per blockHash & senderId
// For example: If a storePrepare is called twice with the same blockHash and sender id, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(blockHash: string): void;
    hasPrePrepare(blockHash: string): boolean;
    storePrepare(blockHash: string, senderId: string): void;
    countOfPrepared(blockHash: string): number;
    storeViewChange(view: number, senderId: string): void;
    countOfViewChange(view: number): number;
}