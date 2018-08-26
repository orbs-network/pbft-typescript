import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Block, BlockUtils, KeyManager } from "../../src";
import { PreparedProof, PrepareMessage, PrePrepareMessage, BlockRefMessage } from "../../src/networkCommunication/Messages";
import { validatePreparedProof } from "../../src/proofsValidator/ProofsValidator";
import { BlockUtilsMock, calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPrepareMessage, aPrePrepareMessage, blockRefMessageFromPP } from "../builders/MessagesBuilder";
import { aPreparedProofByMessages } from "../builders/ProofBuilder";
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
    const targetTerm = term;
    const targetView = view + 1;
    const block: Block = aBlock(theGenesisBlock);
    const preprepareMessage = aPrePrepareMessage(leaderKeyManager, term, view, block);
    const preprepareBlockRefMessage: BlockRefMessage = blockRefMessageFromPP(preprepareMessage);
    const prepareMessage1 = aPrepareMessage(node1KeyManager, term, view, block);
    const prepareMessage2 = aPrepareMessage(node2KeyManager, term, view, block);
    const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
    const calcLeaderPk = (view: number) => membersPKs[view];

    it("should reject a proof that did not have a preprepare", async () => {
        const prepareProof: PreparedProof = {
            preprepareBlockRefMessage: undefined,
            prepareBlockRefMessages: [prepareMessage1, prepareMessage2]
        };
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have a prepare", async () => {
        const prepareProof: PreparedProof = {
            preprepareBlockRefMessage: preprepareBlockRefMessage,
            prepareBlockRefMessages: undefined
        };
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the preprepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", ["Leader PK"]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the prepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", ["Node 2"]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that had no preprepare no no prepare", async () => {
        const actual = validatePreparedProof(0, 0, undefined, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });

    it("should reject a proof that did not have enough prepares", async () => {
        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that does not hold a block in the preprepare", async () => {
        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with mismatching targetTerm", async () => {
        const actual = validatePreparedProof(666, targetView, prepareProof, preprepareMessage.block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with equal targetView", async () => {
        const actual = validatePreparedProof(targetTerm, view, prepareProof, preprepareMessage.block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with smaller targetView", async () => {
        const actual = validatePreparedProof(targetTerm, targetView - 1, prepareProof, preprepareMessage.block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare pk is not part of the membersPKs", async () => {
        const preprepareMessage = aPrePrepareMessage(leaderKeyManager, 0, 0, block);
        const prepareMessage1 = aPrepareMessage(new KeyManagerMock("Not in members PK"), 0, 0, block);
        const prepareMessage2 = aPrepareMessage(node2KeyManager, 0, 0, block);

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(0, 1, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare from the leader", async () => {
        const preprepareMessage = aPrePrepareMessage(leaderKeyManager, term, view, block);
        const prepareMessage1 = aPrepareMessage(leaderKeyManager, term, view, block);
        const prepareMessage2 = aPrepareMessage(node2KeyManager, term, view, block);

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a mismatching view to leader", async () => {
        // Node 2 is the leader here, but it's sending view 0, which is indicating Node 1 as the leader
        const preprepareMessage = aPrePrepareMessage(leaderKeyManager, term, view, block);
        const prepareMessage1 = aPrepareMessage(node1KeyManager, term, view, block);
        const prepareMessage2 = aPrepareMessage(node3KeyManager, term, view, block);
        const calcLeaderPk = (view: number) => ["Node 1", "Node 2", "Node 3", "Node 4"][view];

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that has a prepare that did not match the preprepare view or term", async () => {
        // Good proof //
        const term = 5;
        const view = 0;
        const targetTerm = term;
        const targetView = view + 1;
        const goodPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, term, view, block),
            [
                aPrepareMessage(node1KeyManager, term, view, block),
                aPrepareMessage(node2KeyManager, term, view, block),
            ]);
        const actualGood = validatePreparedProof(targetTerm, targetView, goodPrepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualGood).to.be.true;

        // Mismatching term //
        const badTermPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, term, view, block),
            [
                aPrepareMessage(node1KeyManager, term, view, block),
                aPrepareMessage(node2KeyManager, 666, view, block),
            ]);
        const actualBadTerm = validatePreparedProof(targetTerm, targetView, badTermPrepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadTerm).to.be.false;

        // Mismatching view //
        const badViewPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, term, view, block),
            [
                aPrepareMessage(node1KeyManager, term, view, block),
                aPrepareMessage(node2KeyManager, term, 666, block),
            ]);
        const actualBadView = validatePreparedProof(targetTerm, targetView, badViewPrepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadView).to.be.false;

        // Mismatching blockHash //
        const badPrepareMessage: PrepareMessage = aPrepareMessage(node2KeyManager, term, view, block);
        badPrepareMessage.content.blockHash = Buffer.from("XXXX");
        const badBlockHashPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, term, view, block),
            [
                aPrepareMessage(node1KeyManager, term, view, block),
                badPrepareMessage,
            ]);
        const actualBadBlockHash = validatePreparedProof(targetTerm, targetView, badBlockHashPrepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actualBadBlockHash).to.be.false;
    });

    it("should reject a proof that given block (in the preprepare) doesn't match the blockHash in the messages", async () => {
        const preprepareMessage: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, term, view, block);
        const prepareMessage1: PrepareMessage = aPrepareMessage(leaderKeyManager, term, view, block);
        const prepareMessage2: PrepareMessage = aPrepareMessage(leaderKeyManager, term, view, block);
        const mismatchingBlockHash = calculateBlockHash(theGenesisBlock);

        preprepareMessage.content.blockHash = mismatchingBlockHash;
        prepareMessage1.content.blockHash = mismatchingBlockHash;
        prepareMessage2.content.blockHash = mismatchingBlockHash;

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that with duplicate prepare sender PKs", async () => {
        const prepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, term, view, block),
            [
                aPrepareMessage(node1KeyManager, term, view, block),
                aPrepareMessage(node1KeyManager, term, view, block),
            ]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that qualify", async () => {
        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(targetTerm, targetView, prepareProof, preprepareMessage.block, f, keyManager, blockUtils, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });
});