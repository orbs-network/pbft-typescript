import * as chai from "chai";
import { expect } from "chai";
import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { nextTick } from "../timeUtils";
import { BlockUtilsMock } from "./BlockUtilsMock";

chai.use(sinonChai);

describe("Block Utils", () => {
    it("should be able to initialize BlockUtils", () => {
        const blockValidator = new BlocksValidatorMock();
        const block1: Block = aBlock(theGenesisBlock);
        const block2: Block = aBlock(block1);
        const blockUtils = new BlockUtilsMock(blockValidator, [block1, block2]);
        expect(blockUtils).to.not.be.undefined;
    });

    it("should calculate the given block hash", () => {
        const block: Block = aBlock(theGenesisBlock, Math.random());
        const blockValidator = new BlocksValidatorMock();
        const block1: Block = aBlock(theGenesisBlock);
        const block2: Block = aBlock(block1);
        const blockUtils = new BlockUtilsMock(blockValidator, [block1, block2]);

        const actual = blockUtils.calculateBlockHash(block);
        const expected = createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest(); // "base64");

        expect(actual).to.eql(expected);
    });

    describe("Validator", () => {
        let blockValidator: BlocksValidatorMock;
        let blockUtils: BlockUtilsMock;
        let nextBlock: Block;

        beforeEach(() => {
            const block1: Block = aBlock(theGenesisBlock);
            const block2: Block = aBlock(block1);
            const block3: Block = aBlock(block2);
            nextBlock = aBlock(block3);

            blockValidator = new BlocksValidatorMock();
            blockUtils = new BlockUtilsMock(blockValidator, [block1, block2, block3]);
        });

        it("should called the blockValidator's validateBlock", async () => {
            const spy = sinon.spy(blockValidator, "validateBlock");
            blockUtils.validateBlock(nextBlock).then(() => expect(spy).to.have.been.calledWith(nextBlock));
            await blockValidator.resolveLastValidation(false);
        });

        it("should return the value that returned from the validator", async () => {
            blockUtils.validateBlock(nextBlock).then(isValid => expect(isValid).to.equal(false));
            await nextTick();
            await blockValidator.resolveLastValidation(false);

            blockUtils.validateBlock(nextBlock).then(isValid => expect(isValid).to.equal(true));
            await nextTick();
            await blockValidator.resolveLastValidation(true);
        });

        it("should return false if the given block is not pointing to the previous block hash", async () => {
            const badNextBlock = aBlock(theGenesisBlock);
            blockUtils.validateBlock(badNextBlock)
                .then(isValid => {
                    expect(isValid).to.equal(false);
                });
            await nextTick();
            await blockValidator.resolveLastValidation(true);
        });
    });
});