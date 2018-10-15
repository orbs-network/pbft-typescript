import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "./Messages";
import { MessagesHandler } from "./MessagesHandler";
import { Block } from "../Block";

export interface NetworkCommunication {
    requestOrderedCommittee(seed: number): string[];
    isMember(pk: string): boolean;

    sendMessage(pks: string[], messageContent: string, block?: Block): void;
    registerOnMessage(cb: (messageContent: string, block?: Block) => void): void;
}