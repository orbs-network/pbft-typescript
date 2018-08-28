import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { Logger } from "../../src/logger/Logger";
import { PreparedProof, PrepareMessage, PrePrepareMessage } from "../../src/networkCommunication/Messages";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aCommitMessage, aPrepareMessage, aPrePrepareMessage, aViewChangeMessage } from "../builders/MessagesBuilder";
import { aPreparedProofByMessages, aPrepared } from "../builders/ProofBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { SilentLogger } from "../logger/SilentLogger";
import { PreparedMessages } from "../../src/storage/PBFTStorage";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    const logger: Logger = new SilentLogger();

    it("should clear all storage data after calling clearTermLogs", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const keyManager: KeyManager = new KeyManagerMock("PK");
        const PPMessage = aPrePrepareMessage(keyManager, term, view, block);
        const PMessage = aPrepareMessage(keyManager, term, view, block);
        const CMessage = aCommitMessage(keyManager, term, view, block);
        const VCMessage = aViewChangeMessage(keyManager, term, view);

        // storing
        storage.storePrePrepare(PPMessage);
        storage.storePrepare(PMessage);
        storage.storeCommit(CMessage);
        storage.storeViewChange(VCMessage);

        expect(storage.getPrePrepareMessage(term, view)).to.not.be.undefined;
        expect(storage.getPrepareMessages(term, view, blockHash).length).to.equal(1);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(1);
        expect(storage.getViewChangeMessages(term, view, 0).length).to.equal(1);

        // clearing
        storage.clearTermLogs(term);

        expect(storage.getPrePrepareMessage(term, view)).to.be.undefined;
        expect(storage.getPrepareMessages(term, view, blockHash).length).to.equal(0);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(0);
        expect(storage.getViewChangeMessages(term, view, 0)).to.be.undefined;
    });

    it("storing a preprepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const keyManager: KeyManager = new KeyManagerMock("PK");
        const message = aPrePrepareMessage(keyManager, 1, 1, block);
        const firstTime = storage.storePrePrepare(message);
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrePrepare(message);
        expect(secondstime).to.be.false;
    });

    it("storing a prepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storePrepare(aPrepareMessage(sender1KeyManager, term, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(aPrepareMessage(sender2KeyManager, term, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(aPrepareMessage(sender2KeyManager, term, view, block));
        expect(thirdTime).to.be.false;
    });

    it("storing a commit returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storeCommit(aCommitMessage(sender1KeyManager, term, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(aCommitMessage(sender2KeyManager, term, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(aCommitMessage(sender2KeyManager, term, view, block));
        expect(thirdTime).to.be.false;
    });

    it("storing a view-change returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const view = Math.floor(Math.random() * 1000);
        const term = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const firstTime = storage.storeViewChange(aViewChangeMessage(sender1KeyManager, term, view));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(aViewChangeMessage(sender2KeyManager, term, view));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(aViewChangeMessage(sender2KeyManager, term, view));
        expect(thirdTime).to.be.false;
    });

    it("stores a prepare on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term1 = Math.floor(Math.random() * 1000);
        const term2 = Math.floor(Math.random() * 1000);
        const view1 = Math.floor(Math.random() * 1000);
        const view2 = Math.floor(Math.random() * 1000);
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        const sender3Id = Math.random().toString();
        const keyManager1: KeyManager = new KeyManagerMock(sender1Id);
        const keyManager2: KeyManager = new KeyManagerMock(sender2Id);
        const keyManager3: KeyManager = new KeyManagerMock(sender3Id);
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const block1Hash = calculateBlockHash(block1);
        storage.storePrepare(aPrepareMessage(keyManager1, term1, view1, block1));
        storage.storePrepare(aPrepareMessage(keyManager2, term1, view1, block1));
        storage.storePrepare(aPrepareMessage(keyManager2, term1, view1, block2));
        storage.storePrepare(aPrepareMessage(keyManager3, term1, view2, block1));
        storage.storePrepare(aPrepareMessage(keyManager3, term2, view1, block2));
        const actual = storage.getPrepareSendersPks(term1, view1, block1Hash);
        const expected = [sender1Id, sender2Id];
        expect(actual).to.deep.equal(expected);
    });

    it("stores a commit on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term1 = Math.floor(Math.random() * 1000);
        const term2 = Math.floor(Math.random() * 1000);
        const view1 = Math.floor(Math.random() * 1000);
        const view2 = Math.floor(Math.random() * 1000);
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        const sender3Id = Math.random().toString();
        const keyManager1: KeyManager = new KeyManagerMock(sender1Id);
        const keyManager2: KeyManager = new KeyManagerMock(sender2Id);
        const keyManager3: KeyManager = new KeyManagerMock(sender3Id);
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const block1Hash = calculateBlockHash(block1);
        storage.storeCommit(aCommitMessage(keyManager1, term1, view1, block1));
        storage.storeCommit(aCommitMessage(keyManager2, term1, view1, block1));
        storage.storeCommit(aCommitMessage(keyManager3, term1, view2, block1));
        storage.storeCommit(aCommitMessage(keyManager3, term2, view1, block2));
        const actual = storage.getCommitSendersPks(term1, view1, block1Hash);
        const expected = [sender1Id, sender2Id];
        expect(actual).to.deep.equal(expected);
    });

    describe("Proofs", () => {
        describe("View-Change", () => {
            it("should return the view-change proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                const term1 = Math.floor(Math.random() * 1000);
                const term2 = Math.floor(Math.random() * 1000);
                const view1 = Math.floor(Math.random() * 1000);
                const sender1Id = Math.random().toString();
                const sender2Id = Math.random().toString();
                const sender3Id = Math.random().toString();
                const sender1KeyManager: KeyManager = new KeyManagerMock(sender1Id);
                const sender2KeyManager: KeyManager = new KeyManagerMock(sender2Id);
                const sender3KeyManager: KeyManager = new KeyManagerMock(sender3Id);
                storage.storeViewChange(aViewChangeMessage(sender1KeyManager, term1, view1));
                storage.storeViewChange(aViewChangeMessage(sender2KeyManager, term1, view1));
                storage.storeViewChange(aViewChangeMessage(sender3KeyManager, term1, view1));
                storage.storeViewChange(aViewChangeMessage(sender3KeyManager, term2, view1));
                const actual = storage.getViewChangeMessages(term1, view1, 1);
                const expected = 1 * 2 + 1;
                expect(actual.length).to.deep.equal(expected);
            });
        });

        describe("Prepared", () => {
            const term = Math.floor(Math.random() * 1000);
            const view = Math.floor(Math.random() * 1000);
            const leaderId = Math.floor(Math.random() * 1000).toString();
            const senderId1 = Math.floor(Math.random() * 1000).toString();
            const senderId2 = Math.floor(Math.random() * 1000).toString();
            const leaderKeyManager: KeyManager = new KeyManagerMock(leaderId);
            const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
            const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
            const block = aBlock(theGenesisBlock);

            const preprepareMessage: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, term, view, block);
            const prepareMessage1: PrepareMessage = aPrepareMessage(sender1KeyManager, term, view, block);
            const prepareMessage2: PrepareMessage = aPrepareMessage(sender2KeyManager, term, view, block);

            it("should return the prepare proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(preprepareMessage);
                storage.storePrepare(prepareMessage1);
                storage.storePrepare(prepareMessage2);

                const expectedProof: PreparedMessages = {
                    preprepareMessage,
                    prepareMessages: [prepareMessage1, prepareMessage2]
                };
                const actual: PreparedMessages = storage.getLatestPrepared(term, 1);
                expect(actual).to.deep.equal(expectedProof);
            });

            it("should return the latest (heighest view) prepare proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                const prePrepareMessage10: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 10, block);
                const prepareMessage10_1: PrepareMessage = aPrepareMessage(sender1KeyManager, 1, 10, block);
                const prepareMessage10_2: PrepareMessage = aPrepareMessage(sender2KeyManager, 1, 10, block);

                const prePrepareMessage20: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 20, block);
                const prepareMessage20_1: PrepareMessage = aPrepareMessage(sender1KeyManager, 1, 20, block);
                const prepareMessage20_2: PrepareMessage = aPrepareMessage(sender2KeyManager, 1, 20, block);

                const prePrepareMessage30: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 30, block);
                const prepareMessage30_1: PrepareMessage = aPrepareMessage(sender1KeyManager, 1, 30, block);
                const prepareMessage30_2: PrepareMessage = aPrepareMessage(sender2KeyManager, 1, 30, block);

                storage.storePrePrepare(prePrepareMessage10);
                storage.storePrepare(prepareMessage10_1);
                storage.storePrepare(prepareMessage10_2);

                storage.storePrePrepare(prePrepareMessage30);
                storage.storePrepare(prepareMessage30_1);
                storage.storePrepare(prepareMessage30_2);

                storage.storePrePrepare(prePrepareMessage20);
                storage.storePrepare(prepareMessage20_1);
                storage.storePrepare(prepareMessage20_2);

                const expected: PreparedMessages = {
                    preprepareMessage: prePrepareMessage30,
                    prepareMessages: [prepareMessage30_1, prepareMessage30_2]
                };
                const actual: PreparedMessages = storage.getLatestPrepared(1, 1);
                expect(actual).to.deep.equal(expected);
            });

            it("should return undefined if there was no PrePrepare", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrepare(prepareMessage1);
                storage.storePrepare(prepareMessage2);

                const actual: PreparedMessages = storage.getLatestPrepared(term, 1);
                expect(actual).to.be.undefined;
            });

            it("should return undefined if there was no Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(preprepareMessage);

                const actual: PreparedMessages = storage.getLatestPrepared(term, 1);
                expect(actual).to.be.undefined;
            });

            it("should return undefined where not enough Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(preprepareMessage);
                storage.storePrepare(prepareMessage1);

                const actual: PreparedMessages = storage.getLatestPrepared(term, 3);
                expect(actual).to.be.undefined;
            });
        });
    });
});