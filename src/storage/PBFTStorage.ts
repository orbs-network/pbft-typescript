//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(term: number, view: number, blockHash: string): boolean;
    getPrePrepare(term: number, view: number): string;
    storePrepare(term: number, view: number, senderId: string, blockHash: string): boolean;
    getPrepare(term: number, view: number, blockHash: string): string[];
    storeCommit(term: number, view: number, senderId: string, blockHash: string): boolean;
    getCommit(term: number, view: number, blockHash: string): string[];
    storeViewChange(view: number, senderId: string): boolean;
    countOfViewChange(view: number): number;
}