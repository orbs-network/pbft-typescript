import { theGenesisBlock } from "../builders/BlockBuilder";
import { Block } from "../../src/Block";

export class InMemoryBlockStorage {
    private blockChain: Block[] = [theGenesisBlock];

    public appendBlockToChain(block: Block): void {
        this.blockChain.push(block);
    }

    public getLastBlock(): Block {
        return this.blockChain[this.blockChain.length - 1];
    }

}