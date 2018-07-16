import { theGenesisBlock } from "../builders/BlockBuilder";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { Block } from "../../src/Block";

export class InMemoryBlockStorage implements BlockStorage {
    private blockChain: Block[] = [theGenesisBlock];

    public appendBlockToChain(block: Block): void {
        this.blockChain.push(block);
    }

    public async getLastBlock(): Promise<Block> {
        return this.blockChain[this.blockChain.length - 1];
    }

    public async getBlockChainHeight(): Promise<number> {
        return this.blockChain.length;
    }

}