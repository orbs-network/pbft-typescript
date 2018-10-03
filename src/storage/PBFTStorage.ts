import { Block } from "../Block";
import { CommitMessage, PreparedProof, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../networkCommunication/Messages";

export interface PreparedMessages {
    preprepareMessage: PrePrepareMessage;
    prepareMessages: PrepareMessage[];
}
//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(message: PrePrepareMessage): boolean;
    getPrePrepareBlock(blockHeight: number, view: number): Block;
    getPrePrepareMessage(blockHeight: number, view: number): PrePrepareMessage;

    storePrepare(message: PrepareMessage): boolean;
    getPrepareSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[];
    getPrepareMessages(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage[];
    getLatestPrepared(blockHeight: number, f: number): PreparedMessages;

    storeCommit(message: CommitMessage): boolean;
    getCommitSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[];
    getCommitMessages(blockHeight: number, view: number, blockHash: Buffer): CommitMessage[];

    storeViewChange(message: ViewChangeMessage): boolean;
    getViewChangeMessages(blockHeight: number, view: number, f: number): ViewChangeMessage[];

    clearBlockHeightLogs(blockHeight: number): void;
}