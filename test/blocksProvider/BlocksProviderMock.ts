import { Block } from "../../src/Block";
import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";

export class BlocksProviderMock implements BlocksProvider {
    private blocksPool = theGenesisBlock;

    constructor(private upCommingBlocks: Block[] = []) {

    }

    public async getBlock(): Promise<Block> {
        if (this.upCommingBlocks.length > 0) {
            return this.upCommingBlocks.shift();
        } else {
            return aBlock(this.blocksPool);
        }
    }
}