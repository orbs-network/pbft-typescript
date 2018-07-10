import { Block } from "../Block";

export interface BlockStorage {
    getLastBlockHash(): Promise<Block>;
}
