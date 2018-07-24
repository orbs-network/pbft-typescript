import { Block } from "../Block";
import { PrePreparePayload, PreparePayload, CommitPayload } from "../networkCommunication/Payload";

export interface PreparedProof {
    prepreparePayload: PrePreparePayload;
    preparePayloads: PreparePayload[];
}
//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(term: number, view: number, block: Block, payload: PrePreparePayload): boolean;
    getPrePrepareBlock(term: number, view: number): Block;
    getPrePreparePayload(term: number, view: number): PrePreparePayload;

    storePrepare(term: number, view: number, blockHash: Buffer, senderId: string, payload: PreparePayload): boolean;
    getPrepareSendersPks(term: number, view: number, blockHash: Buffer): string[];
    getPreparePayloads(term: number, view: number, blockHash: Buffer): PreparePayload[];
    getLatestPreparedProff(term: number): PreparedProof;

    storeCommit(term: number, view: number, blockHash: Buffer, senderId: string, payload: CommitPayload): boolean;
    getCommit(term: number, view: number, blockHash: Buffer): string[];

    storeViewChange(term: number, view: number, senderId: string): boolean;
    countOfViewChange(term: number, view: number): number;
}