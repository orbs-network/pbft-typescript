import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
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
        const blockHash = Math.random().toString();
        expect(storage.hasPrePrepare(blockHash)).to.equal(false);
        storage.storePrePrepare(blockHash);
        expect(storage.hasPrePrepare(blockHash)).to.equal(true);
    });

    it("stores a prepare on the storage", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const blockHash = Math.random().toString();
        const sender1Id = Math.random().toString();
        const sender2Id = Math.random().toString();
        storage.storePrepare(blockHash, sender1Id);
        storage.storePrepare(blockHash, sender2Id);
        const actual = storage.countOfPrepared(blockHash);
        expect(actual).to.equal(2);
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