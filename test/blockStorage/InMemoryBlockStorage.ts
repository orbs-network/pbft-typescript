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
}