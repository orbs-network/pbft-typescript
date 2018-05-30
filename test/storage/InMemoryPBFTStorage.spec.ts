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
    it("will create an In Memory instace", () => {
        const storage = new InMemoryPBFTStorage(logger);
        expect(storage).to.not.be.undefined;
    });

    it("stores a preprepare on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term = Math.floor(Math.random() * 1000);
        const block = aBlock(theGenesisBlock);
        expect(storage.getPrePrepare(term)).to.be.undefined;
        storage.storePrePrepare(term, block.hash);
        expect(storage.getPrePrepare(term)).to.equal(block.hash);
    });

    it("stores a prepare on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const term1 = Math.floor(Math.random() * 1000);
        const term2 = Math.floor(Math.random() * 1000);
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        const sender3Id = Math.random().toString();
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        storage.storePrepare(term1, sender1Id, block1.hash);
        storage.storePrepare(term1, sender2Id, block1.hash);
        storage.storePrepare(term2, sender3Id, block2.hash);
        const actual = storage.getPrepare(term1);
        const expected = [{ senderId: sender1Id, blockHash: block1.hash }, { senderId: sender2Id, blockHash: block1.hash }];
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