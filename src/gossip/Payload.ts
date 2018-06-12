import { Block } from "../Block";
export interface PrePreparePayload {
    block: Block;
    view: number;
    term: number;
}

export interface PreparePayload {
    blockHash: string;
    view: number;
    term: number;
}

export interface CommitPayload {
    blockHash: string;
    term: number;
    view: number;
}

export interface ViewChangePayload {
    newView: number;
}

export interface NewViewPayload {
    PP: PrePreparePayload;
}