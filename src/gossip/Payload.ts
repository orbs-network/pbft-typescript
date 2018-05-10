import { Block } from "../Block";
export interface PrePreparePayload {
    block: Block;
    senderPublicKey: string;
    view: number;
}

export interface PreparePayload {
    blockHash: string;
    senderPublicKey: string;
    view: number;
}