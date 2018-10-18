import { Block } from "../Block";
import { CommitMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../networkCommunication/Messages";

//
// This API stores messages that the PBFT received.
// The only assumption is that a message will be stored only once per parameter
// For example: If a storePrepare is called twice with the same values, it will be stored once.
//
export interface PBFTStorage {
    storePrePrepare(message: PrePrepareMessage): boolean;
    getPrePrepareMessage(blockHeight: number, view: number): PrePrepareMessage;
    getPrePrepareBlock(blockHeight: number, view: number): Block;
    getLatestPrePrepare(blockHeight: number): PrePrepareMessage;

    storePrepare(message: PrepareMessage): boolean;
    getPrepareMessages(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage[];
    getPrepareSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[];

    storeCommit(message: CommitMessage): boolean;
    getCommitMessages(blockHeight: number, view: number, blockHash: Buffer): CommitMessage[];
    getCommitSendersPks(blockHeight: number, view: number, blockHash: Buffer): string[];

    storeViewChange(message: ViewChangeMessage): boolean;
    getViewChangeMessages(blockHeight: number, view: number): ViewChangeMessage[];

    clearBlockHeightLogs(blockHeight: number): void;
}