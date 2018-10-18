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
import { PrePrepareMessage } from "../../src/networkCommunication/Messages";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    const logger: Logger = new SilentLogger();

    describe("Simple store/fetch", () => {
        it("preprepare", () => {
            const storage = new InMemoryPBFTStorage(logger);
            const blockHeight = Math.floor(Math.random() * 1000);
            const view = Math.floor(Math.random() * 1000);
            const sender1Id = Math.random().toString();
            const sender2Id = Math.random().toString();
            const keyManager1: KeyManager = new KeyManagerMock(sender1Id);
            const keyManager2: KeyManager = new KeyManagerMock(sender2Id);
            const block = aBlock(theGenesisBlock);
            const preprepageMessage1: PrePrepareMessage = aPrePrepareMessage(keyManager1, blockHeight, view, block);
            const preprepageMessage2: PrePrepareMessage = aPrePrepareMessage(keyManager2, blockHeight, view, block);
            storage.storePrePrepare(preprepageMessage1);
            storage.storePrePrepare(preprepageMessage2);

            const actualPrePrepareMessage = storage.getPrePrepareMessage(blockHeight, view);
            const actualPrePrepareBlock = storage.getPrePrepareBlock(blockHeight, view);

            expect(actualPrePrepareMessage).to.deep.equal(preprepageMessage1);
            expect(actualPrePrepareBlock).to.deep.equal(block);
        });

        it("prepare", () => {
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
            const message1 = aPrepareMessage(keyManager1, blockHeight1, view1, block1);
            const message2 = aPrepareMessage(keyManager2, blockHeight1, view1, block1);
            const message3 = aPrepareMessage(keyManager3, blockHeight1, view1, block1);
            const message4 = aPrepareMessage(keyManager1, blockHeight2, view1, block1); // other height
            const message5 = aPrepareMessage(keyManager1, blockHeight1, view2, block1); // other view
            const message6 = aPrepareMessage(keyManager1, blockHeight1, view1, block2); // other block
            storage.storePrepare(message1);
            storage.storePrepare(message2);
            storage.storePrepare(message3);
            storage.storePrepare(message4);
            storage.storePrepare(message5);
            storage.storePrepare(message6);

            const actualPrepareMessage = storage.getPrepareMessages(blockHeight1, view1, block1Hash);
            const actualPrepareSendersPks = storage.getPrepareSendersPks(blockHeight1, view1, block1Hash);

            expect(actualPrepareMessage).to.deep.equal([message1, message2, message3]);
            expect(actualPrepareSendersPks).to.deep.equal([sender1Id, sender2Id, sender3Id]);
        });

        it("commit", () => {
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
            const message1 = aCommitMessage(keyManager1, blockHeight1, view1, block1);
            const message2 = aCommitMessage(keyManager2, blockHeight1, view1, block1);
            const message3 = aCommitMessage(keyManager3, blockHeight1, view1, block1);
            const message4 = aCommitMessage(keyManager1, blockHeight2, view1, block1); // other height
            const message5 = aCommitMessage(keyManager1, blockHeight1, view2, block1); // other view
            const message6 = aCommitMessage(keyManager1, blockHeight1, view1, block2); // other block
            storage.storeCommit(message1);
            storage.storeCommit(message2);
            storage.storeCommit(message3);
            storage.storeCommit(message4);
            storage.storeCommit(message5);
            storage.storeCommit(message6);

            const actualCommitMessage = storage.getCommitMessages(blockHeight1, view1, block1Hash);
            const actualCommitSendersPks = storage.getCommitSendersPks(blockHeight1, view1, block1Hash);

            expect(actualCommitMessage).to.deep.equal([message1, message2, message3]);
            expect(actualCommitSendersPks).to.deep.equal([sender1Id, sender2Id, sender3Id]);
        });

        it("view change", () => {
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
            const block1Hash = block1.getBlockHash();
            const message1 = aViewChangeMessage(keyManager1, blockHeight1, view1);
            const message2 = aViewChangeMessage(keyManager2, blockHeight1, view1);
            const message3 = aViewChangeMessage(keyManager3, blockHeight1, view1);
            const message4 = aViewChangeMessage(keyManager1, blockHeight2, view1); // other height
            const message5 = aViewChangeMessage(keyManager1, blockHeight1, view2); // other view
            const message6 = aViewChangeMessage(keyManager1, blockHeight1, view1); // other block
            storage.storeViewChange(message1);
            storage.storeViewChange(message2);
            storage.storeViewChange(message3);
            storage.storeViewChange(message4);
            storage.storeViewChange(message5);
            storage.storeViewChange(message6);

            const actualViewChangeMessages = storage.getViewChangeMessages(blockHeight1, view1);

            expect(actualViewChangeMessages).to.deep.equal([message1, message2, message3]);
        });
    });

    it("latest preprepare", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHeight = Math.floor(Math.random() * 1000);
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        const keyManager1: KeyManager = new KeyManagerMock(sender1Id);
        const keyManager2: KeyManager = new KeyManagerMock(sender2Id);
        const block = aBlock(theGenesisBlock);
        const preprepageMessage_on_view_3: PrePrepareMessage = aPrePrepareMessage(keyManager1, blockHeight, 3, block);
        const preprepageMessage_on_view_2: PrePrepareMessage = aPrePrepareMessage(keyManager2, blockHeight, 2, block);
        storage.storePrePrepare(preprepageMessage_on_view_3);
        storage.storePrePrepare(preprepageMessage_on_view_2);

        const actualLatestPrePrepareMessage = storage.getLatestPrePrepare(blockHeight);

        expect(actualLatestPrePrepareMessage).to.deep.equal(preprepageMessage_on_view_3);
    });

    describe("Duplications", () => {
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
    });

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
        expect(storage.getViewChangeMessages(blockHeight, view).length).to.equal(1);

        // clearing
        storage.clearBlockHeightLogs(blockHeight);

        expect(storage.getPrePrepareMessage(blockHeight, view)).to.be.undefined;
        expect(storage.getPrepareMessages(blockHeight, view, blockHash).length).to.equal(0);
        expect(storage.getCommitSendersPks(blockHeight, view, blockHash).length).to.equal(0);
        expect(storage.getViewChangeMessages(blockHeight, view).length).to.equal(0);
    });

});