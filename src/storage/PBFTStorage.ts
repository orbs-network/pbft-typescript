import { Block } from "../Block";
import { CommitMessage, PreparedProof, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../networkCommunication/Messages";

export interface Prepared {
    preprepareMessage: PrePrepareMessage;
    prepareMessages: PrepareMessage[];
}
//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(term: number, view: number, message: PrePrepareMessage): boolean;
    getPrePrepareBlock(term: number, view: number): Block;
    getPrePrepareMessage(term: number, view: number): PrePrepareMessage;

    storePrepare(term: number, view: number, message: PrepareMessage): boolean;
    getPrepareSendersPks(term: number, view: number, blockHash: Buffer): string[];
    getPrepareMessages(term: number, view: number, blockHash: Buffer): PrepareMessage[];
    getLatestPrepared(term: number, f: number): Prepared;

    storeCommit(term: number, view: number, message: CommitMessage): boolean;
    getCommitSendersPks(term: number, view: number, blockHash: Buffer): string[];
    getCommitMessages(term: number, view: number, blockHash: Buffer): CommitMessage[];

    storeViewChange(term: number, view: number, message: ViewChangeMessage): boolean;
    getViewChangeMessages(term: number, view: number, f: number): ViewChangeMessage[];

    clearTermLogs(term: number): void;
}