import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src";
import { BlockRef, CommitMessage, MessageType, NewViewHeader, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, ViewChangeHeader, ViewChangeConfirmation } from "../../src/networkCommunication/Messages";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";
import { MessagesFactoryMock } from "./MessagesFactoryMock";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
chai.use(sinonChai);

describe("Messages Factory", () => {
    const keyManager: KeyManager = new KeyManagerMock("My PK");
    const blockHeight = Math.floor(Math.random() * 1_000_000);
    const view = Math.floor(Math.random() * 1_000_000);
    const block = aBlock(theGenesisBlock);
    const blockHash = block.getBlockHash();
    const messagesFactory: MessagesFactory = new MessagesFactoryMock(keyManager);

    it("should be able to construct a PrePrepare message", async () => {
        const signedHeader: BlockRef = { messageType: MessageType.PREPREPARE, blockHeight, view, blockHash };
        const expectedMessage: PrePrepareMessage = {
            signedHeader,
            sender: keyManager.signBlockRef(signedHeader),
            block
        };
        const actualMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(blockHeight, view, block);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Prepare message", async () => {
        const signedHeader: BlockRef = { messageType: MessageType.PREPARE, blockHeight, view, blockHash };
        const expectedMessage: PrepareMessage = {
            signedHeader,
            sender: keyManager.signBlockRef(signedHeader)
        };
        const actualMessage: PrepareMessage = messagesFactory.createPrepareMessage(blockHeight, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Commit message", async () => {
        const signedHeader: BlockRef = { messageType: MessageType.COMMIT, blockHeight, view, blockHash };
        const expectedMessage: CommitMessage = {
            signedHeader,
            sender: keyManager.signBlockRef(signedHeader)
        };
        const actualMessage: CommitMessage = messagesFactory.createCommitMessage(blockHeight, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a ViewChange message without prepared proof", async () => {
        const signedHeader: ViewChangeHeader = { messageType: MessageType.VIEW_CHANGE, blockHeight, view, preparedProof: undefined };
        const expectedMessage: ViewChangeMessage = {
            signedHeader,
            sender: keyManager.signViewChange(signedHeader),
            block: undefined
        };
        const actualMessage: ViewChangeMessage = messagesFactory.createViewChangeMessage(blockHeight, view);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a ViewChange message with a prepared proof", async () => {
        const preprepareMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(blockHeight, view, block);
        const prepareMessage1: PrepareMessage = messagesFactory.createPrepareMessage(blockHeight, view, blockHash);
        const prepareMessage2: PrepareMessage = messagesFactory.createPrepareMessage(blockHeight, view, blockHash);
        const preparedMessages: PreparedMessages = {
            preprepareMessage,
            prepareMessages: [prepareMessage1, prepareMessage2]
        };
        const signedHeader: ViewChangeHeader = {
            messageType: MessageType.VIEW_CHANGE,
            blockHeight,
            view,
            preparedProof: {
                preprepareBlockRefMessage: {
                    signedHeader: preprepareMessage.signedHeader,
                    sender: preprepareMessage.sender
                },
                prepareBlockRefMessages: preparedMessages.prepareMessages
            }
        };
        const expectedMessage: ViewChangeMessage = {
            signedHeader,
            sender: keyManager.signViewChange(signedHeader),
            block
        };
        const actualMessage: ViewChangeMessage = messagesFactory.createViewChangeMessage(blockHeight, view, preparedMessages);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a New View message", async () => {
        const preprepareMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(blockHeight, view, block);
        const viewChange1: ViewChangeMessage = messagesFactory.createViewChangeMessage(blockHeight, view);
        const vote1: ViewChangeConfirmation = { signedHeader: viewChange1.signedHeader, sender: viewChange1.sender };
        const viewChange2: ViewChangeMessage = messagesFactory.createViewChangeMessage(blockHeight, view);
        const vote2: ViewChangeConfirmation = { signedHeader: viewChange2.signedHeader, sender: viewChange2.sender };
        const viewChangeConfirmations: ViewChangeConfirmation[] = [vote1, vote2];

        const signedHeader: NewViewHeader = { messageType: MessageType.NEW_VIEW, blockHeight, view, viewChangeConfirmations };
        const expectedMessage: NewViewMessage = {
            signedHeader,
            sender: keyManager.signNewView(signedHeader),
            preprepareMessage
        };
        const actualMessage: NewViewMessage = messagesFactory.createNewViewMessage(blockHeight, view, preprepareMessage, viewChangeConfirmations);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });
});