import { Block } from "../Block";
import { MessageType } from "./Messages";

export type NetworkCommunicationCallback = (consensusRawMessage: ConsensusRawMessage) => void;

export interface ConsensusRawMessage {
    messageType: MessageType;
    content: string;
    block?: Block;
}

export interface NetworkCommunication {
    requestOrderedCommittee(seed: number): string[];
    isMember(pk: string): boolean;

    sendMessage(pks: string[], consensusRawMessage: ConsensusRawMessage): void;
    registerOnMessage(cb: NetworkCommunicationCallback): number;
    unRegisterOnMessage(subscriptionToken: number): void;
}