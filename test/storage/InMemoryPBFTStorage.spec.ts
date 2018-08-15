import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { Logger } from "../../src/logger/Logger";
import { PreparePayload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aCommitPayload, aPreparePayload, aPrePreparePayload, aViewChangePayload } from "../builders/PayloadBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { SilentLogger } from "../logger/SilentLogger";

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
        const PPPayload = aPrePreparePayload(keyManager, term, view, block);
        const PPayload = aPreparePayload(keyManager, term, view, block);
        const CPayload = aCommitPayload(keyManager, term, view, block);
        const VCPayload = aViewChangePayload(keyManager, term, view);

        // storing
        storage.storePrePrepare(term, view, PPPayload);
        storage.storePrepare(term, view, PPayload);
        storage.storeCommit(term, view, CPayload);
        storage.storeViewChange(term, view, VCPayload);

        expect(storage.getPrePreparePayload(term, view)).to.not.be.undefined;
        expect(storage.getPreparePayloads(term, view, blockHash).length).to.equal(1);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(1);
        expect(storage.getViewChangeProof(term, view, 0).length).to.equal(1);

        // clearing
        storage.clearTermLogs(term);

        expect(storage.getPrePreparePayload(term, view)).to.be.undefined;
        expect(storage.getPreparePayloads(term, view, blockHash).length).to.equal(0);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(0);
        expect(storage.getViewChangeProof(term, view, 0)).to.be.undefined;
    });

    it("storing a preprepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const keyManager: KeyManager = new KeyManagerMock("PK");
        const payload = aPrePreparePayload(keyManager, 1, 1, block);
        const firstTime = storage.storePrePrepare(term, view, payload);
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrePrepare(term, view, payload);
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
        const firstTime = storage.storePrepare(term, view, aPreparePayload(sender1KeyManager, term, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(term, view, aPreparePayload(sender2KeyManager, term, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(term, view, aPreparePayload(sender2KeyManager, term, view, block));
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
        const firstTime = storage.storeCommit(term, view, aCommitPayload(sender1KeyManager, term, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(term, view, aCommitPayload(sender2KeyManager, term, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(term, view, aCommitPayload(sender2KeyManager, term, view, block));
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
        const firstTime = storage.storeViewChange(term, view, aViewChangePayload(sender1KeyManager, term, view));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(term, view, aViewChangePayload(sender2KeyManager, term, view));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(term, view, aViewChangePayload(sender2KeyManager, term, view));
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
        storage.storePrepare(term1, view1, aPreparePayload(keyManager1, term1, view1, block1));
        storage.storePrepare(term1, view1, aPreparePayload(keyManager2, term1, view1, block1));
        storage.storePrepare(term1, view1, aPreparePayload(keyManager2, term1, view1, block2));
        storage.storePrepare(term1, view2, aPreparePayload(keyManager3, term1, view2, block1));
        storage.storePrepare(term2, view1, aPreparePayload(keyManager3, term2, view1, block2));
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
        storage.storeCommit(term1, view1, aCommitPayload(keyManager1, term1, view1, block1));
        storage.storeCommit(term1, view1, aCommitPayload(keyManager2, term1, view1, block1));
        storage.storeCommit(term1, view2, aCommitPayload(keyManager3, term1, view2, block1));
        storage.storeCommit(term2, view1, aCommitPayload(keyManager3, term2, view1, block2));
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
                storage.storeViewChange(term1, view1, aViewChangePayload(sender1KeyManager, term1, view1));
                storage.storeViewChange(term1, view1, aViewChangePayload(sender2KeyManager, term1, view1));
                storage.storeViewChange(term1, view1, aViewChangePayload(sender3KeyManager, term1, view1));
                storage.storeViewChange(term2, view1, aViewChangePayload(sender3KeyManager, term2, view1));
                const actual = storage.getViewChangeProof(term1, view1, 1);
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
            const blockHash = calculateBlockHash(block);

            const prePreparePayload: PrePreparePayload = aPrePreparePayload(leaderKeyManager, term , view, block);
            const preparePayload1: PreparePayload = aPreparePayload(sender1KeyManager, term, view, block);
            const preparePayload2: PreparePayload = aPreparePayload(sender2KeyManager, term, view, block);

            it("should return the prepare proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, prePreparePayload);
                storage.storePrepare(term, view, preparePayload1);
                storage.storePrepare(term, view, preparePayload2);

                const expectedProof: PreparedProof = {
                    prepreparePayload: prePreparePayload,
                    preparePayloads: [preparePayload1, preparePayload2]
                };
                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 1);
                expect(actualProof).to.deep.equal(expectedProof);
            });

            it("should return the latest (heighest view) prepare proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                const prePreparePayload10: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 10, 1, block);
                const preparePayload10_1: PreparePayload = aPreparePayload(sender1KeyManager, 10, 1, block);
                const preparePayload10_2: PreparePayload = aPreparePayload(sender2KeyManager, 10, 1, block);

                const prePreparePayload20: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 20, 1, block);
                const preparePayload20_1: PreparePayload = aPreparePayload(sender1KeyManager, 20, 1, block);
                const preparePayload20_2: PreparePayload = aPreparePayload(sender2KeyManager, 20, 1, block);

                const prePreparePayload30: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 30, 1, block);
                const preparePayload30_1: PreparePayload = aPreparePayload(sender1KeyManager, 30, 1, block);
                const preparePayload30_2: PreparePayload = aPreparePayload(sender2KeyManager, 30, 1, block);

                storage.storePrePrepare(1, 10, prePreparePayload10);
                storage.storePrepare(1, 10, preparePayload10_1);
                storage.storePrepare(1, 10, preparePayload10_2);

                storage.storePrePrepare(1, 30, prePreparePayload30);
                storage.storePrepare(1, 30, preparePayload30_1);
                storage.storePrepare(1, 30, preparePayload30_2);

                storage.storePrePrepare(1, 20, prePreparePayload20);
                storage.storePrepare(1, 20, preparePayload20_1);
                storage.storePrepare(1, 20, preparePayload20_2);

                const expectedProof: PreparedProof = {
                    prepreparePayload: prePreparePayload30,
                    preparePayloads: [preparePayload30_1, preparePayload30_2]
                };
                const actualProof: PreparedProof = storage.getLatestPreparedProof(1, 1);
                expect(actualProof).to.deep.equal(expectedProof);
            });

            it("should return undefined if there was no PrePrepare", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrepare(term, view, preparePayload1);
                storage.storePrepare(term, view, preparePayload2);

                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 1);
                expect(actualProof).to.be.undefined;
            });

            it("should return undefined if there was no Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, prePreparePayload);

                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 1);
                expect(actualProof).to.be.undefined;
            });

            it("should return undefined where not enough Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, prePreparePayload);
                storage.storePrepare(term, view, preparePayload1);

                const expectedProof: PreparedProof = {
                    prepreparePayload: prePreparePayload,
                    preparePayloads: [preparePayload1, preparePayload2]
                };
                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 3);
                expect(actualProof).to.be.undefined;
            });
        });
    });
});