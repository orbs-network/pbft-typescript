import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Block, KeyManager } from "../../src";
import { BlockRefContent, PreparedProof, PrepareMessage, PrePrepareMessage } from "../../src/networkCommunication/Messages";
import { validatePreparedProof } from "../../src/proofsValidator/ProofsValidator";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPrepareMessage, aPrePrepareMessage, blockRefMessageFromPP } from "../builders/MessagesBuilder";
import { aPreparedProofByMessages } from "../builders/ProofBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
chai.use(sinonChai);

describe("Proofs Validator", () => {
    const keyManager: KeyManager = new KeyManagerMock("My PublicKey");
    const leaderPK = "Leader PK";
    const node1PK = "Node 1";
    const node2PK = "Node 2";
    const node3PK = "Node 3";
    const leaderKeyManager: KeyManager = new KeyManagerMock(leaderPK);
    const node1KeyManager: KeyManager = new KeyManagerMock(node1PK);
    const node2KeyManager: KeyManager = new KeyManagerMock(node2PK);
    const node3KeyManager: KeyManager = new KeyManagerMock(node3PK);
    const membersPKs: string[] = [leaderPK, node1PK, node2PK, node3PK];

    const nodeCount = 4;
    const f = Math.floor(nodeCount / 3);
    const q = nodeCount - f;
    const blockHeight = 0;
    const view = 0;
    const targetBlockHeight = blockHeight;
    const targetView = view + 1;
    const block: Block = aBlock(theGenesisBlock, "Proofs Block");
    const preprepareMessage = aPrePrepareMessage(leaderKeyManager, blockHeight, view, block);
    const prepareMessage1 = aPrepareMessage(node1KeyManager, blockHeight, view, block);
    const prepareMessage2 = aPrepareMessage(node2KeyManager, blockHeight, view, block);
    const prepareMessage3 = aPrepareMessage(node3KeyManager, blockHeight, view, block);
    const goodPrepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2, prepareMessage3]);
    const calcLeaderPk = (view: number) => membersPKs[view];

    it("should approve a proof that qualify", async () => {
        const actual = validatePreparedProof(targetBlockHeight, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });

    it("should reject a proof that did not have a preprepare", async () => {
        const preparedProofWithoutPP: PreparedProof = aPreparedProofByMessages(undefined, [prepareMessage1, prepareMessage2, prepareMessage3]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, preparedProofWithoutPP, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not have a prepare", async () => {
        const preparedProofWithoutP: PreparedProof = aPreparedProofByMessages(preprepareMessage, undefined);
        const actual = validatePreparedProof(targetBlockHeight, targetView, preparedProofWithoutP, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should approve a proof that had no preprepare nor prepare", async () => {
        const actual = validatePreparedProof(0, 0, undefined, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.true;
    });

    it("should reject a proof that did not have enough prepares", async () => {
        const preparedProofWithNotEnoughP: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, preparedProofWithNotEnoughP, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the preprepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", [leaderPK]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that did not pass the prepare signature validation", async () => {
        const keyManager = new KeyManagerMock("DUMMY PK", [node2PK]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with mismatching targetBlockHeight", async () => {
        const actual = validatePreparedProof(666, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with equal targetView", async () => {
        const actual = validatePreparedProof(targetBlockHeight, view, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with smaller targetView", async () => {
        const actual = validatePreparedProof(targetBlockHeight, targetView - 1, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare pk is not part of the membersPKs", async () => {
        const preprepareMessage = aPrePrepareMessage(leaderKeyManager, 0, 0, block);
        const prepareMessage1 = aPrepareMessage(new KeyManagerMock("Not in members PK"), 0, 0, block);
        const prepareMessage2 = aPrepareMessage(node2KeyManager, 0, 0, block);

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2]);
        const actual = validatePreparedProof(0, 1, prepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a prepare from the leader", async () => {
        const preprepareMessage = aPrePrepareMessage(leaderKeyManager, blockHeight, view, block);
        const prepareMessage1 = aPrepareMessage(leaderKeyManager, blockHeight, view, block);
        const prepareMessage2 = aPrepareMessage(node2KeyManager, blockHeight, view, block);
        const prepareMessage3 = aPrepareMessage(node3KeyManager, blockHeight, view, block);

        const prepareProof: PreparedProof = aPreparedProofByMessages(preprepareMessage, [prepareMessage1, prepareMessage2, prepareMessage3]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, prepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof with a mismatching view to leader", async () => {
        const calcLeaderPk = (view: number) => "Some other node PK";
        const actual = validatePreparedProof(targetBlockHeight, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });

    it("should reject a proof that has a prepare that did not match the preprepare view, blockHeight or blackhash", async () => {
        // Good proof //
        const blockHeight = 5;
        const view = 0;
        const targetBlockHeight = blockHeight;
        const targetView = view + 1;
        const goodPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, blockHeight, view, block),
            [
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node2KeyManager, blockHeight, view, block),
                aPrepareMessage(node3KeyManager, blockHeight, view, block),
            ]);
        const actualGood = validatePreparedProof(targetBlockHeight, targetView, goodPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actualGood).to.be.true;

        // Mismatching blockHeight //
        const badHeightPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, blockHeight, view, block),
            [
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node2KeyManager, 666, view, block),
                aPrepareMessage(node3KeyManager, blockHeight, view, block),
            ]);
        const actualBadHeight = validatePreparedProof(targetBlockHeight, targetView, badHeightPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actualBadHeight).to.be.false;

        // Mismatching view //
        const badViewPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, blockHeight, view, block),
            [
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node2KeyManager, blockHeight, 666, block),
                aPrepareMessage(node3KeyManager, blockHeight, view, block),
            ]);
        const actualBadView = validatePreparedProof(targetBlockHeight, targetView, badViewPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actualBadView).to.be.false;

        // Mismatching blockHash //
        const badPrepareMessage: PrepareMessage = aPrepareMessage(node2KeyManager, blockHeight, view, block);
        badPrepareMessage.content.signedHeader.blockHash = Buffer.from("XXXX");
        const badBlockHashPrepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, blockHeight, view, block),
            [
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node2KeyManager, blockHeight, view, block),
                aPrepareMessage(node3KeyManager, blockHeight, view, block),
            ]);
        badBlockHashPrepareProof.prepareBlockRef.blockHash = Buffer.from("XXXX");
        const actualBadBlockHash = validatePreparedProof(targetBlockHeight, targetView, badBlockHashPrepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actualBadBlockHash).to.be.false;
    });

    it("should reject a proof that with duplicate prepare sender PKs", async () => {
        const prepareProof: PreparedProof = aPreparedProofByMessages(
            aPrePrepareMessage(leaderKeyManager, blockHeight, view, block),
            [
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node1KeyManager, blockHeight, view, block),
                aPrepareMessage(node3KeyManager, blockHeight, view, block),
            ]);
        const actual = validatePreparedProof(targetBlockHeight, targetView, prepareProof, q, keyManager, membersPKs, calcLeaderPk);
        expect(actual).to.be.false;
    });
});