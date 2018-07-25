import { Block } from "../Block";
import { PrePreparePayload, PreparePayload, CommitPayload, ViewChangePayload } from "../networkCommunication/Payload";

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
    getLatestPreparedProof(term: number): PreparedProof;

    storeCommit(term: number, view: number, blockHash: Buffer, senderId: string, payload: CommitPayload): boolean;
    getCommitSendersPks(term: number, view: number, blockHash: Buffer): string[];
    getCommitPayloads(term: number, view: number, blockHash: Buffer): CommitPayload[];

    storeViewChange(term: number, view: number, senderId: string, payload: ViewChangePayload): boolean;
    countOfViewChange(term: number, view: number): number;

    clearTermLogs(term: number): void;
}