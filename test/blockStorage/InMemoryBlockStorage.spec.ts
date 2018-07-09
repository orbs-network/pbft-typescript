import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { InMemoryBlockStorage } from "./InMemoryBlockStorage";

chai.use(sinonChai);

describe("InMemory BlockStorage", () => {
    it("should be able to initialize BlockStorage", () => {
        const blockStorage = new InMemoryBlockStorage();
        expect(blockStorage).to.not.be.undefined;
    });

    it("should return the genesis block on height 0", async () => {
        const blockStorage = new InMemoryBlockStorage();

        const actual: string = await blockStorage.getBlockHashOnHeight(0);
        const expected: string = theGenesisBlock.hash;
        expect(actual).to.equal(expected);
    });

    it("should be append to the BlockStorage", async () => {
        const blockStorage = new InMemoryBlockStorage();
        const block: Block = aBlock(theGenesisBlock);
        blockStorage.appendBlockToChain(block);

        const actual: string = await blockStorage.getBlockHashOnHeight(1);
        const expected: string = block.hash;
        expect(actual).to.equal(expected);
    });

    it("should return the top most block", async () => {
        const blockStorage = new InMemoryBlockStorage();
        const block1: Block = aBlock(theGenesisBlock);
        const block2: Block = aBlock(block1);
        const block3: Block = aBlock(block2);
        blockStorage.appendBlockToChain(block1);
        blockStorage.appendBlockToChain(block2);
        blockStorage.appendBlockToChain(block3);

        const actual: Block = await blockStorage.getTopMostBlock();
        const expected = block3;
        expect(actual).to.equal(expected);
    });

    it("should return the block chain height", async () => {
        const blockStorage = new InMemoryBlockStorage();
        const block1: Block = aBlock(theGenesisBlock);
        const block2: Block = aBlock(block1);
        const block3: Block = aBlock(block2);
        blockStorage.appendBlockToChain(block1);
        blockStorage.appendBlockToChain(block2);
        blockStorage.appendBlockToChain(block3);

        const actual: number = await blockStorage.getBlockChainHeight();
        expect(actual).to.equal(4);
    });
});