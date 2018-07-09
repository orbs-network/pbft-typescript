import { Block } from "../Block";

export interface BlockStorage {
    getBlockHashOnHeight(height: number): Promise<string>;
    appendBlockToChain(block: Block): void;
    getTopMostBlock(): Promise<Block>;
    getBlockChainHeight(): Promise<number>;
}
