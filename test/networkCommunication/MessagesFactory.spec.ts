import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src";
import { BlockMessageContent, CommitMessage, MessageType, NewViewContent, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, ViewChangeMessageContent, ViewChangeConfirmation } from "../../src/networkCommunication/Messages";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
chai.use(sinonChai);

describe("Messages Factory", () => {
    const keyManager: KeyManager = new KeyManagerMock("My PK");
    const term = Math.floor(Math.random() * 1_000_000);
    const view = Math.floor(Math.random() * 1_000_000);
    const block = aBlock(theGenesisBlock);
    const blockHash = calculateBlockHash(block);
    const messagesFactory: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);

    it("should be able to construct a PrePrepare message", async () => {
        const signedHeader: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
        const expectedMessage: PrePrepareMessage = {
            signedHeader,
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            },
            block
        };
        const actualMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(term, view, block);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Prepare message", async () => {
        const signedHeader: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
        const expectedMessage: PrepareMessage = {
            signedHeader,
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            }
        };
        const actualMessage: PrepareMessage = messagesFactory.createPrepareMessage(term, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Commit message", async () => {
        const signedHeader: BlockMessageContent = { messageType: MessageType.COMMIT, term, view, blockHash };
        const expectedMessage: CommitMessage = {
            signedHeader,
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            }
        };
        const actualMessage: CommitMessage = messagesFactory.createCommitMessage(term, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a ViewChange message without prepared proof", async () => {
        const signedHeader: ViewChangeMessageContent = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof: undefined };
        const expectedMessage: ViewChangeMessage = {
            signedHeader,
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            },
            block: undefined
        };
        const actualMessage: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a ViewChange message with a prepared proof", async () => {
        const preprepareMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(term, view, block);
        const prepareMessage1: PrepareMessage = messagesFactory.createPrepareMessage(term, view, blockHash);
        const prepareMessage2: PrepareMessage = messagesFactory.createPrepareMessage(term, view, blockHash);
        const preparedMessages: PreparedMessages = {
            preprepareMessage,
            prepareMessages: [prepareMessage1, prepareMessage2]
        };
        const signedHeader: ViewChangeMessageContent = {
            messageType: MessageType.VIEW_CHANGE,
            term,
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
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            },
            block
        };
        const actualMessage: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view, preparedMessages);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a New View message", async () => {
        const preprepareMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(term, view, block);
        const viewChange1: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view);
        const vote1: ViewChangeConfirmation = { signedHeader: viewChange1.signedHeader, sender: viewChange1.sender };
        const viewChange2: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view);
        const vote2: ViewChangeConfirmation = { signedHeader: viewChange2.signedHeader, sender: viewChange2.sender };
        const viewChangeConfirmations: ViewChangeConfirmation[] = [vote1, vote2];

        const signedHeader: NewViewContent = { messageType: MessageType.NEW_VIEW, term, view, viewChangeConfirmations };
        const expectedMessage: NewViewMessage = {
            signedHeader,
            sender: {
                senderPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(signedHeader)
            },
            preprepareMessage
        };
        const actualMessage: NewViewMessage = messagesFactory.createNewViewMessage(term, view, preprepareMessage, viewChangeConfirmations);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });
});