import { Block } from "../../src/Block";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { theGenesisBlock } from "../builders/BlockBuilder";

export class InMemoryBlockStorage implements BlockStorage {
    private blockChain: Block[] = [theGenesisBlock];

    public async getBlockHashOnHeight(height: number): Promise<string> {
        return this.blockChain[height].hash;
    }

    public appendBlockToChain(block: Block): void {
        this.blockChain.push(block);
    }

    public async getTopMostBlock(): Promise<Block> {
        return this.blockChain[this.blockChain.length - 1];
    }

    public async getBlockChainHeight(): Promise<number> {
        return this.blockChain.length;
    }

}