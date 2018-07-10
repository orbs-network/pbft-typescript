import { Block } from "../Block";

export interface BlockStorage {
    getLastBlockHash(): Promise<Block>;
    getBlockChainHeight(): Promise<number>;
}
