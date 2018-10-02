import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { InMemoryBlockChain } from "./InMemoryBlockChain";

chai.use(sinonChai);

describe("InMemory BlockChain", () => {
    it("should be able to initialize BlockChain", () => {
        const blockChain = new InMemoryBlockChain();
        expect(blockChain).to.not.be.undefined;
    });

    it("should return the genesis block as the first block", async () => {
        const blockChain = new InMemoryBlockChain();

        const actual = await blockChain.getLastBlock();
        const expected = theGenesisBlock;
        expect(actual).to.equal(expected);
    });

    it("should be append to the BlockChain", async () => {
        const blockChain = new InMemoryBlockChain();
        const block: Block = aBlock(theGenesisBlock);
        blockChain.appendBlockToChain(block);

        const lastBlock = await blockChain.getLastBlock();
        expect(lastBlock).to.deep.equal(block);
    });

    it("should return the top most block", async () => {
        const blockChain = new InMemoryBlockChain();
        const block1: Block = aBlock(theGenesisBlock);
        const block2: Block = aBlock(block1);
        const block3: Block = aBlock(block2);
        blockChain.appendBlockToChain(block1);
        blockChain.appendBlockToChain(block2);
        blockChain.appendBlockToChain(block3);

        const actual = await blockChain.getLastBlock();
        const expected = block3;
        expect(actual).to.equal(expected);
    });
});