import * as chai from "chai";
import * as sinonChai from "sinon-chai";
import { validatePrepared } from "../../src/proofsValidator/ProofsValidator";
import { KeyManager, Block, BlockUtils } from "../../src";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { expect } from "chai";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { aPrePreparePayload, aPayload } from "../builders/PayloadBuilder";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { calculateBlockHash, BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
chai.use(sinonChai);

describe("Proofs Validator", () => {
    const keyManager: KeyManager = new KeyManagerMock("My public key");
    const blockUtils: BlockUtils = new BlockUtilsMock();
    const f = Math.floor(4 / 3);
    const term = 5;
    const view = 9;
    const block: Block = aBlock(theGenesisBlock);
    const blockHash = calculateBlockHash(block);
    const prepreparePayload = aPrePreparePayload("Leader PK", { term, view, blockHash }, block);
    const preparePayload1 = aPayload("Node 1", { term, view, blockHash });
    const preparePayload2 = aPayload("Node 2", { term, view, blockHash });

    it("should reject a proof that did not have a preprepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: undefined,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have a prepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: undefined
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have enough prepares", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.false;
    });

    it("should reject a proof that has a prepare that did not match the preprepare view or term", async () => {
        // Good proof //
        const goodPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 2", { term: 5, view: 9, blockHash }),
            ]
        };
        const actualGood = validatePrepared(goodPrepareProof, f, keyManager, blockUtils);
        expect(actualGood).to.be.true;

        // Mismatching term //
        const badTermPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 2", { term: 666, view: 9, blockHash }),
            ]
        };
        const actualBadTerm = validatePrepared(badTermPrepareProof, f, keyManager, blockUtils);
        expect(actualBadTerm).to.be.false;

        // Mismatching view //
        const badViewPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 2", { term: 5, view: 666, blockHash }),
            ]
        };
        const actualBadView = validatePrepared(badViewPrepareProof, f, keyManager, blockUtils);
        expect(actualBadView).to.be.false;

        // Mismatching blockHash //
        const badBlockHashPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 2", { term: 5, view: 9, blockHash: "XXXX" }),
            ]
        };
        const actualBadBlockHash = validatePrepared(badBlockHashPrepareProof, f, keyManager, blockUtils);
        expect(actualBadBlockHash).to.be.false;
    });

    it("should reject a proof that given block (in the preprepare) doesn't match the blockHash in the payloads", async () => {
        const mismatchingBlockHash = calculateBlockHash(theGenesisBlock);
        const prepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash: mismatchingBlockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash: mismatchingBlockHash }),
                aPayload("Node 2", { term: 5, view: 9, blockHash: mismatchingBlockHash }),
            ]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.false;
    });

    it("should reject a proof that with duplicate prepare sender PKs", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload("Leader PK", { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
            ]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.false;
    });

    // Qualifing proof follow these rules:
    // * has a preprepare that was sent by the leader
    // * has matching prepares
    // * all the prepares should be unique (No duplicate senderPK, also with the preprepare)
    // * the count of prepares should be more or equal to the given f * 2
    it("should approve a proof that qualify", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils);
        expect(actual).to.be.true;
    });
});