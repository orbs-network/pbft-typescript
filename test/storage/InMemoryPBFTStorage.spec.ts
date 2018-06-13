import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { SilentLogger } from "../logger/SilentLogger";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    const logger: Logger = new SilentLogger();

    it("storing a preprepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storePrePrepare(term, view, block.hash);
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrePrepare(term, view, block.hash);
        expect(secondstime).to.be.false;
    });

    it("storing a prepare returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storePrepare(term, view, senderId1, block.hash);
        expect(firstTime).to.be.true;
        const secondstime = storage.storePrepare(term, view, senderId2, block.hash);
        expect(secondstime).to.be.true;
        const thirdTime = storage.storePrepare(term, view, senderId2, block.hash);
        expect(thirdTime).to.be.false;
    });

    it("storing a commit returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const block = aBlock(theGenesisBlock);
        const firstTime = storage.storeCommit(term, view, senderId1, block.hash);
        expect(firstTime).to.be.true;
        const secondstime = storage.storeCommit(term, view, senderId2, block.hash);
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeCommit(term, view, senderId2, block.hash);
        expect(thirdTime).to.be.false;
    });

    it("storing a view-change returns true if it stored a new value, false if it already exists", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const view = Math.floor(Math.random() * 1000);
        const senderId1 = Math.floor(Math.random() * 1000).toString();
        const senderId2 = Math.floor(Math.random() * 1000).toString();
        const firstTime = storage.storeViewChange(view, senderId1);
        expect(firstTime).to.be.true;
        const secondstime = storage.storeViewChange(view, senderId2);
        expect(secondstime).to.be.true;
        const thirdTime = storage.storeViewChange(view, senderId2);
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
        storage.storePrepare(term1, view1, sender1Id, block1.hash);
        storage.storePrepare(term1, view1, sender2Id, block1.hash);
        storage.storePrepare(term1, view1, sender2Id, block2.hash);
        storage.storePrepare(term1, view2, sender3Id, block1.hash);
        storage.storePrepare(term2, view1, sender3Id, block2.hash);
        const actual = storage.getPrepare(term1, view1, block1.hash);
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
        storage.storeCommit(term1, view1, sender1Id, block1.hash);
        storage.storeCommit(term1, view1, sender2Id, block1.hash);
        storage.storeCommit(term1, view2, sender3Id, block1.hash);
        storage.storeCommit(term2, view1, sender3Id, block2.hash);
        const actual = storage.getCommit(term1, view1, block1.hash);
        const expected = [sender1Id, sender2Id];
        expect(actual).to.deep.equal(expected);
    });

    it("stores a view-change on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        storage.storeViewChange(1, sender1Id);
        storage.storeViewChange(1, sender2Id);
        const actual = storage.countOfViewChange(1);
        expect(actual).to.equal(2);
    });
});