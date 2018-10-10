import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aCommitMessage, aPrepareMessage, aPrePrepareMessage, aViewChangeMessage } from "../builders/MessagesBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { SilentLogger } from "../logger/SilentLogger";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    const logger: Logger = new SilentLogger();

    it("should clear all storage data after calling clearBlockHeightLogs", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHeight = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const blockHash = block.getBlockHash();
        const keyManager: KeyManager = new KeyManagerMock("PK");
        const PPMessage = aPrePrepareMessage(keyManager, blockHeight, view, block);
        const PMessage = aPrepareMessage(keyManager, blockHeight, view, block);
        const CMessage = aCommitMessage(keyManager, blockHeight, view, block);
        const VCMessage = aViewChangeMessage(keyManager, blockHeight, view);

        // storing
        storage.storePrePrepare(PPMessage);
        storage.storePrepare(PMessage);
        storage.storeCommit(CMessage);
        storage.storeViewChange(VCMessage);

        expect(storage.getPrePrepareMessage(blockHeight, view)).to.not.be.undefined;
        expect(storage.getPrepareMessages(blockHeight, view, blockHash).length).to.equal(1);
        expect(storage.getCommitSendersPks(blockHeight, view, blockHash).length).to.equal(1);
        expect(storage.getViewChangeMessages(blockHeight, view, 0).length).to.equal(1);

        // clearing
        storage.clearBlockHeightLogs(blockHeight);

        expect(storage.getPrePrepareMessage(blockHeight, view)).to.be.undefined;
        expect(storage.getPrepareMessages(blockHeight, view, blockHash).length).to.equal(0);
        expect(storage.getCommitSendersPks(blockHeight, view, blockHash).length).to.equal(0);
        expect(storage.getViewChangeMessages(blockHeight, view, 0)).to.be.undefined;
    });

    it("storing a preprepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
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
        const blockHeight = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storePrepare(aPrepareMessage(sender1KeyManager, blockHeight, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(aPrepareMessage(sender2KeyManager, blockHeight, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(aPrepareMessage(sender2KeyManager, blockHeight, view, block));
        expect(thirdTime).to.be.false;
    });

    it("storing a commit returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHeight = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storeCommit(aCommitMessage(sender1KeyManager, blockHeight, view, block));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(aCommitMessage(sender2KeyManager, blockHeight, view, block));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(aCommitMessage(sender2KeyManager, blockHeight, view, block));
        expect(thirdTime).to.be.false;
    });

    it("storing a view-change returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const view = Math.floor(Math.random() * 1000);
        const blockHeight = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
        const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
        const firstTime = storage.storeViewChange(aViewChangeMessage(sender1KeyManager, blockHeight, view));
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(aViewChangeMessage(sender2KeyManager, blockHeight, view));
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(aViewChangeMessage(sender2KeyManager, blockHeight, view));
        expect(thirdTime).to.be.false;
    });

    it("stores a prepare on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHeight1 = Math.floor(Math.random() * 1000);
        const blockHeight2 = Math.floor(Math.random() * 1000);
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
        const block1Hash = block1.getBlockHash();
        storage.storePrepare(aPrepareMessage(keyManager1, blockHeight1, view1, block1));
        storage.storePrepare(aPrepareMessage(keyManager2, blockHeight1, view1, block1));
        storage.storePrepare(aPrepareMessage(keyManager2, blockHeight1, view1, block2));
        storage.storePrepare(aPrepareMessage(keyManager3, blockHeight1, view2, block1));
        storage.storePrepare(aPrepareMessage(keyManager3, blockHeight2, view1, block2));
        const actual = storage.getPrepareSendersPks(blockHeight1, view1, block1Hash);
        const expected = [sender1Id, sender2Id];
        expect(actual).to.deep.equal(expected);
    });

    it("stores a commit on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHeight1 = Math.floor(Math.random() * 1000);
        const blockHeight2 = Math.floor(Math.random() * 1000);
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
        const block1Hash = block1.getBlockHash();
        storage.storeCommit(aCommitMessage(keyManager1, blockHeight1, view1, block1));
        storage.storeCommit(aCommitMessage(keyManager2, blockHeight1, view1, block1));
        storage.storeCommit(aCommitMessage(keyManager3, blockHeight1, view2, block1));
        storage.storeCommit(aCommitMessage(keyManager3, blockHeight2, view1, block2));
        const actual = storage.getCommitSendersPks(blockHeight1, view1, block1Hash);
        const expected = [sender1Id, sender2Id];
        expect(actual).to.deep.equal(expected);
    });

    describe("Proofs", () => {
        describe("View-Change", () => {
            it("should return the view-change proof", () => {
                const storage = new InMemoryPBFTStorage(logger);
                const blockHeight1 = Math.floor(Math.random() * 1000);
                const blockHeight2 = Math.floor(Math.random() * 1000);
                const view1 = Math.floor(Math.random() * 1000);
                const sender1Id = Math.random().toString();
                const sender2Id = Math.random().toString();
                const sender3Id = Math.random().toString();
                const sender1KeyManager: KeyManager = new KeyManagerMock(sender1Id);
                const sender2KeyManager: KeyManager = new KeyManagerMock(sender2Id);
                const sender3KeyManager: KeyManager = new KeyManagerMock(sender3Id);
                storage.storeViewChange(aViewChangeMessage(sender1KeyManager, blockHeight1, view1));
                storage.storeViewChange(aViewChangeMessage(sender2KeyManager, blockHeight1, view1));
                storage.storeViewChange(aViewChangeMessage(sender3KeyManager, blockHeight1, view1));
                storage.storeViewChange(aViewChangeMessage(sender3KeyManager, blockHeight2, view1));
                const actual = storage.getViewChangeMessages(blockHeight1, view1, 1);
                const expected = 1 * 2 + 1;
                expect(actual.length).to.deep.equal(expected);
            });
        });
    });
});