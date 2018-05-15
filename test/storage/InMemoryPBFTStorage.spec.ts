import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";

chai.use(sinonChai);

describe("PBFT In Memory Storage", () => {
    it("will create an In Memory instace", async () => {
        const storage = new InMemoryPBFTStorage();
        expect(storage).to.not.be.undefined;
    });

    it("stores a prepare on the store", async () => {
        const storage = new InMemoryPBFTStorage();
        const blockHash = Math.random().toString();
        const sender1PublicKey = Math.random().toString();
        const sender2PublicKey = Math.random().toString();
        storage.storePrepare(blockHash, sender1PublicKey);
        storage.storePrepare(blockHash, sender2PublicKey);
        const actual = storage.countOfPrepared(blockHash);
        expect(actual).to.equal(2);
    });

    it("stores a view-change on the store", async () => {
        const storage = new InMemoryPBFTStorage();
        const sender1PublicKey = Math.random().toString();
        const sender2PublicKey = Math.random().toString();
        storage.storeViewChange(1, sender1PublicKey);
        storage.storeViewChange(1, sender2PublicKey);
        const actual = storage.countOfViewChange(1);
        expect(actual).to.equal(2);
    });
});