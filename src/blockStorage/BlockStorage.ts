import { Block } from "../Block";

export interface BlockStorage {
    getLastBlock(): Promise<Block>;
    getBlockChainHeight(): number;
}
