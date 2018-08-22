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

export interface PrePrepareMessage extends LeanHelixMessage {
    content: BlockMessageContent;
    signaturePair: SignaturePair;
    block: Block;
}

export interface PrepareMessage extends LeanHelixMessage {
    content: BlockMessageContent;
    signaturePair: SignaturePair;
}

export interface CommitMessage extends LeanHelixMessage {
    content: BlockMessageContent;
    signaturePair: SignaturePair;
}

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
    blockHash: Buffer;
    term: number;
    view: number;
    preprepareMessageSignature: SignaturePair;
    prepareMessagesSignatures: SignaturePair[];
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
