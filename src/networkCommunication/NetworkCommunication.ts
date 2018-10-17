import { Block } from "../Block";

export type NetworkCommunicationCallback = (consensusRawMessage: ConsensusRawMessage) => void;

export interface ConsensusRawMessage {
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