//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(term: number, view: number, blockHash: string): boolean;
    getPrePrepare(term: number, view: number): string;
    storePrepare(term: number, view: number, blockHash: string, senderId: string): boolean;
    getPrepare(term: number, view: number, blockHash: string): string[];
    storeCommit(term: number, view: number, blockHash: string, senderId: string): boolean;
    getCommit(term: number, view: number, blockHash: string): string[];
    storeViewChange(term: number, view: number, senderId: string): boolean;
    countOfViewChange(term: number, view: number): number;
}