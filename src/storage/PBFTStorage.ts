//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per term & senderId
// For example: If a storePrepare is called twice with the same term and sender id, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(term: number, blockHash: string): void;
    getPrePrepare(term: number): string;
    storePrepare(term: number, senderId: string, blockHash: string): void;
    getPrepare(term: number): Array<{ senderId: string, blockHash: string }>;
    storeViewChange(view: number, senderId: string): void;
    countOfViewChange(view: number): number;
}