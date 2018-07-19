import * as chai from "chai";
import { expect } from "chai";
import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { BlockUtils, calculateBlockHash } from "../../src/blockUtils/BlockUtils";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { nextTick } from "../timeUtils";

chai.use(sinonChai);

describe("Block Utils", () => {
    it("should be able to initialize BlockUtils", () => {
        const blockValidator = new BlocksValidatorMock();
        const blockProvider = new BlocksProviderMock();
        const blockUtils = new BlockUtils(blockValidator, blockProvider);
        expect(blockUtils).to.not.be.undefined;
    });

    it("should called the blockProvider's requestNewBlock", () => {
        const providedBlock: Block = aBlock(theGenesisBlock);
        const blockValidator = new BlocksValidatorMock();
        const blockProvider = new BlocksProviderMock([providedBlock]);
        const blockUtils = new BlockUtils(blockValidator, blockProvider);
        const spy = sinon.spy(blockProvider, "requestNewBlock");
        blockUtils.requestNewBlock(2)
            .then(block => {
                expect(spy).to.have.been.calledWith(2);
                expect(block).to.equal(providedBlock);
            });
        blockProvider.provideNextBlock();
    });

    it("should calculate the given block hash", () => {
        const block: Block = aBlock(theGenesisBlock, Math.random());

        const actual = calculateBlockHash(block);
        const expected = createHash("sha256").update(stringify(block)).digest("base64");

        expect(actual).to.equal(expected);
    });

    describe("Validator", () => {
        let blockValidator: BlocksValidatorMock;
        let blockProvider: BlocksProviderMock;
        let blockUtils: BlockUtils;
        let nextBlock: Block;

        beforeEach(() => {
            blockValidator = new BlocksValidatorMock();
            blockProvider = new BlocksProviderMock();
            blockUtils = new BlockUtils(blockValidator, blockProvider);

            const block1: Block = aBlock(theGenesisBlock);
            const block2: Block = aBlock(block1);
            const block3: Block = aBlock(block2);
            blockUtils.setLastCommittedBlockHash(calculateBlockHash(block3));
            nextBlock = aBlock(block3);
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