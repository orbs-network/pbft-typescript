import { Block } from "../Block";

export enum MessageType {
    PREPREPARE = 0,
    PREPARE = 1,
    COMMIT = 2,
    VIEW_CHANGE = 3,
    NEW_VIEW = 4,
}
export interface LeanHelixMessage {
    sender: SenderSignature;
    signedHeader: {
        messageType: MessageType;
        blockHeight: number;
    };
}

export interface BlockRefMessage extends LeanHelixMessage {
    signedHeader: BlockRef;
    sender: SenderSignature;
}

export type PrePrepareMessage = BlockRefMessage & { block: Block };
export type PrepareMessage = BlockRefMessage;
export type CommitMessage = BlockRefMessage;

export interface ViewChangeMessage extends LeanHelixMessage {
    signedHeader: ViewChangeHeader;
    sender: SenderSignature;
    block?: Block;
}

export interface NewViewMessage extends LeanHelixMessage {
    signedHeader: NewViewHeader;
    sender: SenderSignature;
    preprepareMessage: PrePrepareMessage;
}

export interface SenderSignature {
    senderPublicKey: string;
    signature: string;
}

export interface BlockRef {
    messageType: MessageType;
    blockHeight: number;
    view: number;
    blockHash: Buffer;
}

export interface ViewChangeHeader {
    messageType: MessageType;
    blockHeight: number;
    view: number;
    preparedProof?: PreparedProof;
}

export interface PreparedProof {
    preprepareBlockRef: BlockRef;
    preprepareSender: SenderSignature;
    prepareBlockRef: BlockRef;
    prepareSenders: SenderSignature[];
}

export interface NewViewHeader {
    messageType: MessageType;
    blockHeight: number;
    view: number;
    viewChangeConfirmations: ViewChangeConfirmation[];
}

export interface ViewChangeConfirmation {
    signedHeader: ViewChangeHeader;
    sender: SenderSignature;
}
