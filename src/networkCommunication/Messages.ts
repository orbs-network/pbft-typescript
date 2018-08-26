import { Block } from "../Block";

export enum MessageType {
    PREPREPARE = 0,
    PREPARE = 1,
    COMMIT = 2,
    VIEW_CHANGE = 3,
    NEW_VIEW = 4,
}
export interface LeanHelixMessage {
    signaturePair: SignaturePair;
    content: {
        messageType: MessageType;
        term: number;
        view: number;
    };
}

export interface BlockRefMessage extends LeanHelixMessage {
    content: BlockMessageContent;
    signaturePair: SignaturePair;
}

export type PrePrepareMessage = BlockRefMessage & { block: Block };
export type PrepareMessage = BlockRefMessage;
export type CommitMessage = BlockRefMessage;

export interface ViewChangeMessage extends LeanHelixMessage {
    content: ViewChangeMessageContent;
    signaturePair: SignaturePair;
    block?: Block;
}

export interface NewViewMessage extends LeanHelixMessage {
    content: NewViewContent;
    signaturePair: SignaturePair;
    preprepareMessage: PrePrepareMessage;
}

export interface SignaturePair {
    signerPublicKey: string;
    contentSignature: string;
}

export interface BlockMessageContent {
    messageType: MessageType;
    term: number;
    view: number;
    blockHash: Buffer;
}

export interface ViewChangeMessageContent {
    messageType: MessageType;
    term: number;
    view: number;
    preparedProof?: PreparedProof;
}

export interface PreparedProof {
    preprepareBlockRefMessage: BlockRefMessage;
    prepareBlockRefMessages: BlockRefMessage[];
}

export interface NewViewContent {
    messageType: MessageType;
    term: number;
    view: number;
    votes: ViewChangeVote[];
}

export interface ViewChangeVote {
    content: ViewChangeMessageContent;
    signaturePair: SignaturePair;
}
