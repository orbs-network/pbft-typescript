import { Block } from "../Block";

export interface BlockStorage {
    getBlockHashOnHeight(height: number): Promise<string>;
    getTopMostBlock(): Promise<Block>;
    getBlockChainHeight(): Promise<number>;
}
