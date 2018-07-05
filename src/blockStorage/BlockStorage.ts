import { Block } from "../Block";

export interface BlockStorage {
    getBlockHashOnHeight(height: number): string;
    appendBlockToChain(block: Block): void;
}