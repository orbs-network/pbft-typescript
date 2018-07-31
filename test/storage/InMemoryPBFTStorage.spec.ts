import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { SilentLogger } from "../logger/SilentLogger";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aPayload, aPrePreparePayload } from "../builders/PayloadBuilder";
import { PrePreparePayload, PreparePayload } from "../../src/networkCommunication/Payload";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";

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
        const PPayload = aPayload(keyManager, {});
        const CPayload = aPayload(keyManager, {});
        const VCPayload = aPayload(keyManager, {});

        // storing
        storage.storePrePrepare(term, view, block, PPPayload);
        storage.storePrepare(term, view, blockHash, "PK", PPayload);
        storage.storeCommit(term, view, blockHash, "PK", CPayload);
        storage.storeViewChange(term, view, "PK", VCPayload);

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
        const firstTime = storage.storePrePrepare(term, view, block, payload);
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrePrepare(term, view, block, payload);
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
        const blockHash = calculateBlockHash(block);
        const firstTime = storage.storePrepare(term, view, blockHash, senderId1, aPayload(sender1KeyManager, Math.random()));
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(term, view, blockHash, senderId2, aPayload(sender2KeyManager, Math.random()));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(term, view, blockHash, senderId2, aPayload(sender2KeyManager, Math.random()));
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
        const blockHash = calculateBlockHash(block);
        const firstTime = storage.storeCommit(term, view, blockHash, senderId1, aPayload(sender1KeyManager, Math.random()));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(term, view, blockHash, senderId2, aPayload(sender2KeyManager, Math.random()));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(term, view, blockHash, senderId2, aPayload(sender2KeyManager, Math.random()));
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
        const firstTime = storage.storeViewChange(term, view, senderId1, aPayload(sender1KeyManager, {}));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(term, view, senderId2, aPayload(sender2KeyManager, {}));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(term, view, senderId2, aPayload(sender2KeyManager, {}));
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
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const block1Hash = calculateBlockHash(block1);
        const block2Hash = calculateBlockHash(block2);
        storage.storePrepare(term1, view1, block1Hash, sender1Id, undefined);
        storage.storePrepare(term1, view1, block1Hash, sender2Id, undefined);
        storage.storePrepare(term1, view1, block2Hash, sender2Id, undefined);
        storage.storePrepare(term1, view2, block1Hash, sender3Id, undefined);
        storage.storePrepare(term2, view1, block2Hash, sender3Id, undefined);
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
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const block1Hash = calculateBlockHash(block1);
        const block2Hash = calculateBlockHash(block2);
        storage.storeCommit(term1, view1, block1Hash, sender1Id, undefined);
        storage.storeCommit(term1, view1, block1Hash, sender2Id, undefined);
        storage.storeCommit(term1, view2, block1Hash, sender3Id, undefined);
        storage.storeCommit(term2, view1, block2Hash, sender3Id, undefined);
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
                storage.storeViewChange(term1, view1, sender1Id, aPayload(sender1KeyManager, {}));
                storage.storeViewChange(term1, view1, sender2Id, aPayload(sender2KeyManager, {}));
                storage.storeViewChange(term1, view1, sender3Id, aPayload(sender3KeyManager, {}));
                storage.storeViewChange(term2, view1, sender3Id, aPayload(sender3KeyManager, {}));
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
            const preparePayload1: PreparePayload = aPayload(sender1KeyManager, { view, term, blockHash });
            const preparePayload2: PreparePayload = aPayload(sender2KeyManager, { view, term, blockHash });

            it("should return the prepare proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, block, prePreparePayload);
                storage.storePrepare(term, view, blockHash, senderId1, preparePayload1);
                storage.storePrepare(term, view, blockHash, senderId2, preparePayload2);

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
                const preparePayload10_1: PreparePayload = aPayload(sender1KeyManager, { view: 10, term: 1, blockHash });
                const preparePayload10_2: PreparePayload = aPayload(sender2KeyManager, { view: 10, term: 1, blockHash });

                const prePreparePayload20: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 20, 1, block);
                const preparePayload20_1: PreparePayload = aPayload(sender1KeyManager, { view: 20, term: 1, blockHash });
                const preparePayload20_2: PreparePayload = aPayload(sender2KeyManager, { view: 20, term: 1, blockHash });

                const prePreparePayload30: PrePreparePayload = aPrePreparePayload(leaderKeyManager, 30, 1, block);
                const preparePayload30_1: PreparePayload = aPayload(sender1KeyManager, { view: 30, term: 1, blockHash });
                const preparePayload30_2: PreparePayload = aPayload(sender2KeyManager, { view: 30, term: 1, blockHash });

                storage.storePrePrepare(1, 10, block, prePreparePayload10);
                storage.storePrepare(1, 10, blockHash, senderId1, preparePayload10_1);
                storage.storePrepare(1, 10, blockHash, senderId2, preparePayload10_2);

                storage.storePrePrepare(1, 30, block, prePreparePayload30);
                storage.storePrepare(1, 30, blockHash, senderId1, preparePayload30_1);
                storage.storePrepare(1, 30, blockHash, senderId2, preparePayload30_2);

                storage.storePrePrepare(1, 20, block, prePreparePayload20);
                storage.storePrepare(1, 20, blockHash, senderId1, preparePayload20_1);
                storage.storePrepare(1, 20, blockHash, senderId2, preparePayload20_2);

                const expectedProof: PreparedProof = {
                    prepreparePayload: prePreparePayload30,
                    preparePayloads: [preparePayload30_1, preparePayload30_2]
                };
                const actualProof: PreparedProof = storage.getLatestPreparedProof(1, 1);
                expect(actualProof).to.deep.equal(expectedProof);
            });

            it("should return undefined if there was no PrePrepare", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrepare(term, view, blockHash, senderId1, preparePayload1);
                storage.storePrepare(term, view, blockHash, senderId2, preparePayload2);

                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 1);
                expect(actualProof).to.be.undefined;
            });

            it("should return undefined if there was no Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, block, prePreparePayload);

                const actualProof: PreparedProof = storage.getLatestPreparedProof(term, 1);
                expect(actualProof).to.be.undefined;
            });

            it("should return undefined where not enough Prepares", () => {
                const storage = new InMemoryPBFTStorage(logger);
                storage.storePrePrepare(term, view, block, prePreparePayload);
                storage.storePrepare(term, view, blockHash, senderId1, preparePayload1);

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