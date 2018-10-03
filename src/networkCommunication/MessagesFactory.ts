import { Block } from "../Block";
import { PreparedMessages } from "../storage/PBFTStorage";
import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeConfirmation, ViewChangeMessage } from "./Messages";

export interface MessagesFactory {
    createPreprepareMessage(blockHeight: number, view: number, block: Block): PrePrepareMessage;
    createPrepareMessage(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage;
    createCommitMessage(blockHeight: number, view: number, blockHash: Buffer): CommitMessage;
    createViewChangeMessage(blockHeight: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage;
    createNewViewMessage(blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeConfirmation[]): NewViewMessage;
}