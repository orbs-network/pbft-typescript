import { Block } from "../Block";
export interface SuggestedBlockPayload {
    block: Block;
    senderPublicKey: string;
}