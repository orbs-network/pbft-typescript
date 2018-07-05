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
        const blockStorage: BlockStorage = new InMemoryBlockStorage();
        expect(blockStorage).to.not.be.undefined;
    });

    it("should return the genesis block on height 0", () => {
        const blockStorage: BlockStorage = new InMemoryBlockStorage();

        const actual = blockStorage.getBlockHashOnHeight(0);
        const expected = theGenesisBlock.hash;
        expect(actual).to.equal(expected);
    });

    it("should be append to the BlockStorage", () => {
        const blockStorage: BlockStorage = new InMemoryBlockStorage();
        const block: Block = aBlock(theGenesisBlock);
        blockStorage.appendBlockToChain(block);

        const actual = blockStorage.getBlockHashOnHeight(1);
        const expected = block.hash;
        expect(actual).to.equal(expected);
    });
});