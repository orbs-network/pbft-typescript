import { Block } from "../Block";
import { PreparedProof } from "../storage/PBFTStorage";

export interface PayloadData {
    messageType: string;
    [key: string]: any;
}

export interface Payload {
    pk: string;
    signature: string;
    data: PayloadData;
}

export interface PrePreparePayloadData extends PayloadData {
    messageType: "preprepare";
    blockHash: Buffer;
    view: number;
    term: number;
}

export interface PrePreparePayload extends Payload {
    data: PrePreparePayloadData;
    block: Block;
}

export interface PreparePayloadData extends PayloadData {
    messageType: "prepare";
    blockHash: Buffer;
    view: number;
    term: number;
}

export interface PreparePayload extends Payload {
    data: PreparePayloadData;
}


export interface CommitPayloadData extends PayloadData {
    messageType: "commit";
    blockHash: Buffer;
    term: number;
    view: number;
}

export interface CommitPayload extends Payload {
    data: CommitPayloadData;
}

export interface ViewChangePayloadData extends PayloadData {
    messageType: "view-change";
    term: number;
    newView: number;
    preparedProof: PreparedProof;
}

export interface ViewChangePayload extends Payload {
    data: ViewChangePayloadData;
}

export interface NewViewPayloadData extends PayloadData {
    messageType: "new-view";
    PP: PrePreparePayload;
    VCProof: ViewChangePayload[];
    term: number;
    view: number;
}

export interface NewViewPayload extends Payload {
    data: NewViewPayloadData;
}