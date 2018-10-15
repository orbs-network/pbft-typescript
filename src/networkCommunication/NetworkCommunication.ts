import { Block } from "../Block";

export interface ConsensusRawMessage {
    content: string;
    block?: Block;
}

export interface NetworkCommunication {
    requestOrderedCommittee(seed: number): string[];
    isMember(pk: string): boolean;

    sendMessage(pks: string[], consensusRawMessage: ConsensusRawMessage): void;
    registerOnMessage(cb: (consensusRawMessage: ConsensusRawMessage) => void): void;
}