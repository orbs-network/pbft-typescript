import { Block } from "../Block";

export interface BlockStorage {
    getBlockHashOnHeight(height: number): Promise<string>;
    getLastBlockHash(): Promise<Block>;
    getBlockChainHeight(): Promise<number>;
}
