import { Block } from "../Block";
import { PreparedProof } from "../storage/PBFTStorage";

export interface Payload {
    pk: string;
    signature: string;
    data: any;
}

export interface PrePreparePayload extends Payload {
    data: {
        blockHash: Buffer;
        view: number;
        term: number;
    };
    block: Block;
}

export interface PreparePayload extends Payload {
    data: {
        blockHash: Buffer;
        view: number;
        term: number;
    };
}

export interface CommitPayload extends Payload {
    data: {
        blockHash: Buffer;
        term: number;
        view: number;
    };
}

export interface ViewChangePayload extends Payload {
    data: {
        term: number;
        newView: number;
        preparedProof: PreparedProof;
    };
}

export interface NewViewPayload extends Payload {
    data: {
        PP: PrePreparePayload;
        term: number;
        view: number;
    };
}