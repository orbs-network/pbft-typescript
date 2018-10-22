import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager, Logger } from "../../src";
import { PrepareMessage, PrePrepareMessage } from "../../src/networkCommunication/Messages";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { extractPreparedMessages, PreparedMessages } from "../../src/storage/PreparedMessagesExtractor";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPrepareMessage, aPrePrepareMessage } from "../builders/MessagesBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { SilentLogger } from "../logger/SilentLogger";
chai.use(sinonChai);

describe("Prepared Messages Extractor", () => {
    const logger: Logger = new SilentLogger();
    const blockHeight = Math.floor(Math.random() * 1000);
    const view = Math.floor(Math.random() * 1000);
    const leaderId = Math.floor(Math.random() * 1000).toString();
    const senderId1 = Math.floor(Math.random() * 1000).toString();
    const senderId2 = Math.floor(Math.random() * 1000).toString();
    const leaderKeyManager: KeyManager = new KeyManagerMock(leaderId);
    const sender1KeyManager: KeyManager = new KeyManagerMock(senderId1);
    const sender2KeyManager: KeyManager = new KeyManagerMock(senderId2);
    const block = aBlock(theGenesisBlock);

    const preprepareMessage: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, blockHeight, view, block);
    const prepareMessage1: PrepareMessage = aPrepareMessage(sender1KeyManager, blockHeight, view, block);
    const prepareMessage2: PrepareMessage = aPrepareMessage(sender2KeyManager, blockHeight, view, block);

    it("should return the prepare proof", () => {
        const storage = new InMemoryPBFTStorage(logger);
        storage.storePrePrepare(preprepareMessage);
        storage.storePrepare(prepareMessage1);
        storage.storePrepare(prepareMessage2);

        const expectedProof: PreparedMessages = {
            preprepareMessage,
            prepareMessages: [prepareMessage1, prepareMessage2]
        };
        const q = 3;
        const actual: PreparedMessages = extractPreparedMessages(blockHeight, storage, q);
        expect(actual).to.deep.equal(expectedProof);
    });

    it("should return the latest (heighest view) preprepare message", () => {
        const storage = new InMemoryPBFTStorage(logger);
        const prePrepareMessage10: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 10, block);
        const prePrepareMessage20: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 20, block);
        const prePrepareMessage30: PrePrepareMessage = aPrePrepareMessage(leaderKeyManager, 1, 30, block);

        storage.storePrePrepare(prePrepareMessage10);
        storage.storePrePrepare(prePrepareMessage30);
        storage.storePrePrepare(prePrepareMessage20);

        const actual: PrePrepareMessage = storage.getLatestPrePrepare(1);
        expect(actual).to.deep.equal(prePrepareMessage30);
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
        const q = 3;
        const actual: PreparedMessages = extractPreparedMessages(1, storage, q);
        expect(actual).to.deep.equal(expected);
    });

    it("should return undefined if there was no PrePrepare", () => {
        const storage = new InMemoryPBFTStorage(logger);
        storage.storePrepare(prepareMessage1);
        storage.storePrepare(prepareMessage2);

        const q = 3;
        const actual: PreparedMessages = extractPreparedMessages(blockHeight, storage, q);
        expect(actual).to.be.undefined;
    });

    it("should return undefined if there was no Prepares", () => {
        const storage = new InMemoryPBFTStorage(logger);
        storage.storePrePrepare(preprepareMessage);

        const q = 3;
        const actual: PreparedMessages = extractPreparedMessages(blockHeight, storage, q);
        expect(actual).to.be.undefined;
    });

    it("should return undefined where not enough Prepares", () => {
        const storage = new InMemoryPBFTStorage(logger);
        storage.storePrePrepare(preprepareMessage);
        storage.storePrepare(prepareMessage1);

        const actual: PreparedMessages = extractPreparedMessages(blockHeight, storage, 3);
        expect(actual).to.be.undefined;
    });
});