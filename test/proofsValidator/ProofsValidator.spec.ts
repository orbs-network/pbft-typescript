import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Block, BlockUtils, KeyManager } from "../../src";
import { PreparePayload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { validatePrepared } from "../../src/proofsValidator/ProofsValidator";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { BlockUtilsMock, calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPreparePayload, aPrePreparePayload } from "../builders/PayloadBuilder";
import { anEmptyPreparedProof } from "../builders/ProofBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
chai.use(sinonChai);

describe("Proofs Validator", () => {
    const keyManager: KeyManager = new KeyManagerMock("Dummy PK");
    const leaderKeyManager: KeyManager = new KeyManagerMock("Leader PK");
    const node1KeyManager: KeyManager = new KeyManagerMock("Node 1");
    const node2KeyManager: KeyManager = new KeyManagerMock("Node 2");
    const node3KeyManager: KeyManager = new KeyManagerMock("Node 3");
    const membersPKs: string[] = ["Leader PK", "Node 1", "Node 2", "Node 3"];

    const blockUtils: BlockUtils = new BlockUtilsMock();
    const f = Math.floor(4 / 3);
    const term = 0;
    const view = 0;
    const block: Block = aBlock(theGenesisBlock);
    const blockHash = calculateBlockHash(block);
    const prepreparePayload = aPrePreparePayload(leaderKeyManager, term, view, block);
    const preparePayload1 = aPreparePayload(node1KeyManager, term, view, block);
    const preparePayload2 = aPreparePayload(node2KeyManager, term, view, block);
    const calcLeaderPk = (view: number) => membersPKs[view];

    it("should reject a proof that did not have a preprepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: undefined,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have a prepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: undefined
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the preprepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", ["Leader PK"]);

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the prepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", ["Node 2"]);

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that had no preprepare no no prepare", async () => {
        const actual = validatePrepared(anEmptyPreparedProof(), f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });

    it("should reject a proof that did not have enough prepares", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that does not hold a block in the preprepare", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare pk is not part of the membersPKs", async () => {
        const prepreparePayload = aPrePreparePayload(leaderKeyManager, 0, 0, block);
        const preparePayload1 = aPreparePayload(new KeyManagerMock("Not in members PK"), 0, 0, block);
        const preparePayload2 = aPreparePayload(node2KeyManager, 0, 0, block);

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare from the leader", async () => {
        const prepreparePayload = aPrePreparePayload(leaderKeyManager, 0, 0, block);
        const preparePayload1 = aPreparePayload(leaderKeyManager, 0, 0, block);
        const preparePayload2 = aPreparePayload(node2KeyManager, 0, 0, block);

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a mismatching view to leader", async () => {
        // Node 2 is the leader here, but it's sending view 0, which is indicating Node 1 as the leader
        const prepreparePayload = aPrePreparePayload(leaderKeyManager, 0, 0, block);
        const preparePayload1 = aPreparePayload(node1KeyManager, 0, 0, block);
        const preparePayload2 = aPreparePayload(node3KeyManager, 0, 0, block);
        const calcLeaderPk = (view: number) => ["Node 1", "Node 2", "Node 3", "Node 4"][view];

        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that has a prepare that did not match the preprepare view or term", async () => {
        // Good proof //
        const goodPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 0, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 0, block),
                aPreparePayload(node2KeyManager, 5, 0, block),
            ]
        };
        const goodPrepareProof2: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 0, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 0, block),
                aPreparePayload(node2KeyManager, 5, 0, block),
            ]
        };
        const actualGood = validatePrepared(goodPrepareProof2, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualGood).to.be.true;

        // Mismatching term //
        const badTermPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 0, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 0, block),
                aPreparePayload(node2KeyManager, 666, 0, block),
            ]
        };
        const actualBadTerm = validatePrepared(badTermPrepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadTerm).to.be.false;

        // Mismatching view //
        const badViewPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 0, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 0, block),
                aPreparePayload(node2KeyManager, 5, 666, block),
            ]
        };
        const actualBadView = validatePrepared(badViewPrepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadView).to.be.false;

        // Mismatching blockHash //
        const badPreparePayload: PreparePayload = aPreparePayload(node2KeyManager, 5, 9, block);
        badPreparePayload.data.blockHash = Buffer.from("XXXX");
        const badBlockHashPrepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 9, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 9, block),
                badPreparePayload,
            ]
        };
        const actualBadBlockHash = validatePrepared(badBlockHashPrepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadBlockHash).to.be.false;
    });

    it("should reject a proof that given block (in the preprepare) doesn't match the blockHash in the payloads", async () => {
        const prepreparePayload: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 5, 9, block);
        const preparePayload1: PreparePayload = aPreparePayload(leaderKeyManager, 5, 9, block);
        const preparePayload2: PreparePayload = aPreparePayload(leaderKeyManager, 5, 9, block);
        const mismatchingBlockHash = calculateBlockHash(theGenesisBlock);

        prepreparePayload.data.blockHash = mismatchingBlockHash;
        preparePayload1.data.blockHash = mismatchingBlockHash;
        preparePayload2.data.blockHash = mismatchingBlockHash;

        const prepareProof: PreparedProof = {
            prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that with duplicate prepare sender PKs", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: aPrePreparePayload(leaderKeyManager, 5, 9, block),
            preparePayloads: [
                aPreparePayload(node1KeyManager, 5, 9, block),
                aPreparePayload(node1KeyManager, 5, 9, block),
            ]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that qualify", async () => {
        const prepareProof: PreparedProof = {
            prepreparePayload: prepreparePayload,
            preparePayloads: [preparePayload1, preparePayload2]
        };
        const actual = validatePrepared(prepareProof, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });
});