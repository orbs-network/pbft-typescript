import { Block } from "../Block";

export function serializeMessage(messageContent: BlockRefContent | ViewChangeContent | NewViewContent): string {
    return JSON.stringify(messageContent);
}

function recursiveDeserializeBuffers(obj: any): any {
    if (typeof obj !== "object") {
        return obj;
    }

    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return Buffer.from(obj.data);
    }

    for (const key in obj) {
        obj[key] = recursiveDeserializeBuffers(obj[key]);
    }

    return obj;
}

export function deserializeMessage(messageContent: string, block?: Block): any {
    const result: any = {
        content: recursiveDeserializeBuffers(JSON.parse(messageContent)),
    };

    if (block) {
        result.block = block;
    }

    return result;
}

export enum MessageType {
    PREPREPARE = 0,
    PREPARE = 1,
    COMMIT = 2,
    VIEW_CHANGE = 3,
    NEW_VIEW = 4,
}
export interface BlockRefContent {
    signedHeader: BlockRef;
    sender: SenderSignature;
}

export type PrePrepareMessage = {
    content: BlockRefContent;
    block: Block;
};

export type PrepareMessage = {
    content: BlockRefContent;
};

export type CommitMessage = {
    content: BlockRefContent;
};

export type ViewChangeMessage = {
    content: ViewChangeContent;
    block: Block;
};

export type NewViewMessage = {
    content: NewViewContent;
    block: Block;
};

export interface ViewChangeContent {
    signedHeader: ViewChangeHeader;
    sender: SenderSignature;
}

export interface NewViewContent {
    signedHeader: NewViewHeader;
    sender: SenderSignature;
    preprepareContent: BlockRefContent;
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
    viewChangeConfirmations: ViewChangeContent[];
}
