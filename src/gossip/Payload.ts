import { Block } from "../Block";
export interface PrePreparePayload {
    block: Block;
    view: number;
}

export interface PreparePayload {
    blockHash: string;
    view: number;
}

export interface ViewChangePayload {
    newView: number;
}

export interface NewViewPayload {
    view: number;
}