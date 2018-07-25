import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { SilentLogger } from "../logger/SilentLogger";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aPrePreparePayload, aPayload } from "../builders/PayloadBuilder";
import { PrePreparePayload, PreparePayload } from "../../src/networkCommunication/Payload";
import { PreparedProof } from "../../src/storage/PBFTStorage";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    const logger: Logger = new SilentLogger();

    it("should clear all storage data after calling clearTermLogs", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const PPPayload = aPrePreparePayload("pk", {}, block);
        const PPayload = aPayload("pk", {});
        const CPayload = aPayload("pk", {});
        const VCPayload = aPayload("pk", {});

        // storing
        storage.storePrePrepare(term, view, block, PPPayload);
        storage.storePrepare(term, view, blockHash, "Dummy sender", PPayload);
        storage.storeCommit(term, view, blockHash, "Dummy sender", CPayload);
        storage.storeViewChange(term, view, "Dummy sender", VCPayload);

        expect(storage.getPrePreparePayload(term, view)).to.not.be.undefined;
        expect(storage.getPreparePayloads(term, view, blockHash).length).to.equal(1);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(1);
        expect(storage.countOfViewChange(term, view)).to.equal(1);

        // clearing
        storage.clearTermLogs(term);

        expect(storage.getPrePreparePayload(term, view)).to.be.undefined;
        expect(storage.getPreparePayloads(term, view, blockHash).length).to.equal(0);
        expect(storage.getCommitSendersPks(term, view, blockHash).length).to.equal(0);
        expect(storage.countOfViewChange(term, view)).to.equal(0);
    });

    it("storing a preprepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const payload = aPrePreparePayload("pk", {}, block);
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
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const firstTime = storage.storePrepare(term, view, blockHash, senderId1, aPayload(senderId1, Math.random()));
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(term, view, blockHash, senderId2, aPayload(senderId2, Math.random()));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(term, view, blockHash, senderId2, aPayload(senderId2, Math.random()));
        expect(thirdTime).to.be.false;
    });

    it("storing a commit returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const firstTime = storage.storeCommit(term, view, blockHash, senderId1, aPayload(senderId1, Math.random()));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(term, view, blockHash, senderId2, aPayload(senderId2, Math.random()));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(term, view, blockHash, senderId2, aPayload(senderId2, Math.random()));
        expect(thirdTime).to.be.false;
    });

    it("storing a view-change returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const view = Math.floor(Math.random() * 1000);
        const term = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const VCPayload = aPayload("pk", {});
        const firstTime = storage.storeViewChange(term, view, senderId1, VCPayload);
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(term, view, senderId2, VCPayload);
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(term, view, senderId2, VCPayload);
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

    it("stores a view-change on the storage", () => {
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
        const VCPayload = aPayload("pk", {});
        storage.storeViewChange(term1, view1, sender1Id, VCPayload);
        storage.storeViewChange(term1, view1, sender2Id, VCPayload);
        storage.storeViewChange(term1, view2, sender3Id, VCPayload);
        storage.storeViewChange(term2, view1, sender3Id, VCPayload);
        const actual = storage.countOfViewChange(term1, view1);
        expect(actual).to.deep.equal(2);
    });

    describe("Proofs", () => {
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const leaderId = Math.floor(Math.random() * 1000).toString();
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);

        const prePreparePayload: PrePreparePayload = aPrePreparePayload(leaderId, { view, term, blockHash }, block);
        const preparePayload1: PreparePayload = aPayload(senderId1, { view, term, blockHash });
        const preparePayload2: PreparePayload = aPayload(senderId2, { view, term, blockHash });

        it("should return the prepare proof", () => {
            const storage = new InMemoryPBFTStorage(logger);
            storage.storePrePrepare(term, view, block, prePreparePayload);
            storage.storePrepare(term, view, blockHash, senderId1, preparePayload1);
            storage.storePrepare(term, view, blockHash, senderId2, preparePayload2);

            const expectedProof: PreparedProof = {
                prepreparePayload: prePreparePayload,
                preparePayloads: [preparePayload1, preparePayload2]
            };
            const actualProof: PreparedProof = storage.getLatestPreparedProof(term);
            expect(actualProof).to.deep.equal(expectedProof);
        });

        it("should return the latest (heighest view) prepare proof", () => {
            const storage = new InMemoryPBFTStorage(logger);
            const prePreparePayload10: PrePreparePayload = aPrePreparePayload(leaderId, { view: 10, term: 1, blockHash }, block);
            const preparePayload10_1: PreparePayload = aPayload(senderId1, { view: 10, term: 1, blockHash });
            const preparePayload10_2: PreparePayload = aPayload(senderId2, { view: 10, term: 1, blockHash });

            const prePreparePayload20: PrePreparePayload = aPrePreparePayload(leaderId, { view: 20, term: 1, blockHash }, block);
            const preparePayload20_1: PreparePayload = aPayload(senderId1, { view: 20, term: 1, blockHash });
            const preparePayload20_2: PreparePayload = aPayload(senderId2, { view: 20, term: 1, blockHash });

            const prePreparePayload30: PrePreparePayload = aPrePreparePayload(leaderId, { view: 30, term: 1, blockHash }, block);
            const preparePayload30_1: PreparePayload = aPayload(senderId1, { view: 30, term: 1, blockHash });
            const preparePayload30_2: PreparePayload = aPayload(senderId2, { view: 30, term: 1, blockHash });

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
            const actualProof: PreparedProof = storage.getLatestPreparedProof(1);
            expect(actualProof).to.deep.equal(expectedProof);
        });

        it("should return the undefined is there was no PrePrepare", () => {
            const storage = new InMemoryPBFTStorage(logger);
            storage.storePrepare(term, view, blockHash, senderId1, preparePayload1);
            storage.storePrepare(term, view, blockHash, senderId2, preparePayload2);

            const actualProof: PreparedProof = storage.getLatestPreparedProof(term);
            expect(actualProof).to.be.undefined;
        });

        it("should return the undefined is there was no Prepares", () => {
            const storage = new InMemoryPBFTStorage(logger);
            storage.storePrePrepare(term, view, block, prePreparePayload);

            const actualProof: PreparedProof = storage.getLatestPreparedProof(term);
            expect(actualProof).to.be.undefined;
        });
    });
});