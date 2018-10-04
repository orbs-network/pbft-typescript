import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "./Messages";
import { MessagesHandler } from "./MessagesHandler";

export interface NetworkCommunication {
    requestOrderedCommittee(seed: number): string[];
    isMember(pk: string): boolean;

    sendPrePrepare(pks: string[], message: PrePrepareMessage): void;
    sendPrepare(pks: string[], message: PrepareMessage): void;
    sendCommit(pks: string[], message: CommitMessage): void;
    sendViewChange(pk: string, message: ViewChangeMessage): void;
    sendNewView(pks: string[], message: NewViewMessage): void;

    registerHandler(messagesHandler: MessagesHandler): void;
}