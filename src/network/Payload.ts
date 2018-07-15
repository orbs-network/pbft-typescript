import { Block } from "../Block";

export interface Payload {
    pk: string;
    signature: string;
    data: any;
}

export interface PrePreparePayload extends Payload {
    data: {
        block: Block;
        view: number;
        term: number;
    };
}

export interface PreparePayload extends Payload {
    data: {
        blockHash: string;
        view: number;
        term: number;
    };
}

export interface CommitPayload extends Payload {
    data: {
        blockHash: string;
        term: number;
        view: number;
    };
}

export interface ViewChangePayload extends Payload {
    data: {
        term: number;
        newView: number;
    };
}

export interface NewViewPayload extends Payload {
    data: {
        PP: PrePreparePayload;
        term: number;
        view: number;
    };
}