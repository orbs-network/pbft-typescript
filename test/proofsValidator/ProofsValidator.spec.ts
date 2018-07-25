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
    const keyManager: KeyManager = new KeyManagerMock("Dummy PK");
    const leaderKeyManager: KeyManager = new KeyManagerMock("Leader PK");
    const node1KeyManager: KeyManager = new KeyManagerMock("Node 1");
    const node2KeyManager: KeyManager = new KeyManagerMock("Node 2");
    const blockUtils: BlockUtils = new BlockUtilsMock();
    const f = Math.floor(4 / 3);
    const term = 0;
    const view = 0;
    const block: Block = aBlock(theGenesisBlock);
    const blockHash = calculateBlockHash(block);
    const prepreparePayload = aPrePreparePayload(leaderKeyManager, { term, view, blockHash }, block);
    const preparePayload1 = aPayload("Node 1", { term, view, blockHash });
    const preparePayload2 = aPayload("Node 2", { term, view, blockHash });
    const calcLeaderPk = (view: number) => ["Leader PK", "Node 1", "Node 2", "Node 3"][view];

    it("should reject a proof that did not have a preprepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: undefined,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have a prepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: undefined
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", ["Leader PK"]);

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that had no preprepare no no prepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: undefined,
            preparePayloads: undefined
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.true;
    });

    it("should reject a proof that did not have enough prepares", async () => {
        const prepreparePayload = aPrePreparePayload(leaderKeyManager, { term, view, blockHash }, undefined);
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that does not hold a block in the preprepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a mismatching view to leader", async () => {
        // Node 2 is the leader here, but it's sending view 0, which is indicating Node 1 as the leader
        const prepreparePayload = aPrePreparePayload(leaderKeyManager, { term: 0, view: 0, blockHash }, block);
        const preparePayload1 = aPayload("Node 1", { term: 0, view: 0, blockHash });
        const preparePayload2 = aPayload("Node 3", { term: 0, view: 0, blockHash });
        const calcLeaderPk = (view: number) => ["Node 1", "Node 2", "Node 3", "Node 4"][view];

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that has a prepare that did not match the preprepare view or term", async () => {
        // Good proof //
        const goodPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 0, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 0, blockHash }),
                aPayload("Node 2", { term: 5, view: 0, blockHash }),
            ]
        };
        const actualGood = validatePrepared(goodPrepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actualGood).to.be.true;

        // Mismatching term //
        const badTermPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 0, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 0, blockHash }),
                aPayload("Node 2", { term: 666, view: 0, blockHash }),
            ]
        };
        const actualBadTerm = validatePrepared(badTermPrepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actualBadTerm).to.be.false;

        // Mismatching view //
        const badViewPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 0, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 0, blockHash }),
                aPayload("Node 2", { term: 5, view: 666, blockHash }),
            ]
        };
        const actualBadView = validatePrepared(badViewPrepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actualBadView).to.be.false;

        // Mismatching blockHash //
        const badBlockHashPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 2", { term: 5, view: 9, blockHash: "XXXX" }),
            ]
        };
        const actualBadBlockHash = validatePrepared(badBlockHashPrepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actualBadBlockHash).to.be.false;
    });

    it("should reject a proof that given block (in the preprepare) doesn't match the blockHash in the payloads", async () => {
        const mismatchingBlockHash = calculateBlockHash(theGenesisBlock);
        const prepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 9, blockHash: mismatchingBlockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash: mismatchingBlockHash }),
                aPayload("Node 2", { term: 5, view: 9, blockHash: mismatchingBlockHash }),
            ]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that with duplicate prepare sender PKs", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, { term: 5, view: 9, blockHash }, block),
            preparePayloads: [
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
                aPayload("Node 1", { term: 5, view: 9, blockHash }),
            ]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that qualify", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, calcLeaderPk);
        expect(actual).to.be.true;
    });
});