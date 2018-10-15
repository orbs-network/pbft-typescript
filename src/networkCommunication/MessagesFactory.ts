import { Block } from "../Block";
import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, ViewChangeContent } from "./Messages";
import { PreparedMessages } from "../storage/PreparedMessagesExtractor";

export interface MessagesFactory {
    createPreprepareMessage(blockHeight: number, view: number, block: Block): PrePrepareMessage;
    createPrepareMessage(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage;
    createCommitMessage(blockHeight: number, view: number, blockHash: Buffer): CommitMessage;
    createViewChangeMessage(blockHeight: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage;
    createNewViewMessage(blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeContent[]): NewViewMessage;
}