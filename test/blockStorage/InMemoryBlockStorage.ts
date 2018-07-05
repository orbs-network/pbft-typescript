import { Block } from "../../src/Block";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { theGenesisBlock } from "../builders/BlockBuilder";

export class InMemoryBlockStorage implements BlockStorage {
    private blockChain: Block[] = [theGenesisBlock];

    public getBlockHashOnHeight(height: number): string {
        return this.blockChain[height].hash;
    }

    public appendBlockToChain(block: Block): void {
        this.blockChain.push(block);
    }

    public getTopMostBlock(): Block {
        return this.blockChain[this.blockChain.length - 1];
    }

    public getBlockChainHeight(): number {
        return this.blockChain.length;
    }

}