import * as chai from "chai";
import * as sinonChai from "sinon-chai";
import { expect } from "chai";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";
import { BlockUtils, KeyManager } from "../../src";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { PrePrepareMessage, MessageType, BlockMessageContent, PrepareMessage, CommitMessage, ViewChangeMessage, ViewChangeMessageContent, PreparedProof, ViewChangeVote, NewViewMessage, NewViewContent } from "../../src/networkCommunication/Messages";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
chai.use(sinonChai);

describe("Messages Factory", () => {
    const blockUtils: BlockUtils = new BlockUtilsMock();
    const keyManager: KeyManager = new KeyManagerMock("My PK");
    const term = Math.floor(Math.random() * 1_000_000);
    const view = Math.floor(Math.random() * 1_000_000);
    const block = aBlock(theGenesisBlock);
    const blockHash = blockUtils.calculateBlockHash(block);
    const messagesFactory: MessagesFactory = new MessagesFactory(blockUtils, keyManager);

    it("should be able to construct a PrePrepare message", async () => {
        const content: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
        const expectedMessage: PrePrepareMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
            },
            block
        };
        const actualMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(term, view, block);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Prepare message", async () => {
        const content: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
        const expectedMessage: PrepareMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
            }
        };
        const actualMessage: PrepareMessage = messagesFactory.createPrepareMessage(term, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a Commit message", async () => {
        const content: BlockMessageContent = { messageType: MessageType.COMMIT, term, view, blockHash };
        const expectedMessage: CommitMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
            }
        };
        const actualMessage: CommitMessage = messagesFactory.createCommitMessage(term, view, blockHash);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a ViewChange message without prepared proof", async () => {
        const content: ViewChangeMessageContent = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof: undefined };
        const expectedMessage: ViewChangeMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
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
        const content: ViewChangeMessageContent = {
            messageType: MessageType.VIEW_CHANGE,
            term,
            view,
            preparedProof: {
                preprepareBlockRefMessage: {
                    content: preprepareMessage.content,
                    signaturePair: preprepareMessage.signaturePair
                },
                prepareBlockRefMessages: preparedMessages.prepareMessages
            }
        };
        const expectedMessage: ViewChangeMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
            },
            block
        };
        const actualMessage: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view, preparedMessages);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });

    it("should be able to construct a New View message", async () => {
        const preprepareMessage: PrePrepareMessage = messagesFactory.createPreprepareMessage(term, view, block);
        const viewChange1: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view);
        const vote1: ViewChangeVote = { content: viewChange1.content, signaturePair: viewChange1.signaturePair };
        const viewChange2: ViewChangeMessage = messagesFactory.createViewChangeMessage(term, view);
        const vote2: ViewChangeVote = { content: viewChange2.content, signaturePair: viewChange2.signaturePair };
        const votes: ViewChangeVote[] = [vote1, vote2];

        const content: NewViewContent = { messageType: MessageType.NEW_VIEW, term, view, votes };
        const expectedMessage: NewViewMessage = {
            content,
            signaturePair: {
                signerPublicKey: keyManager.getMyPublicKey(),
                contentSignature: keyManager.sign(content)
            },
            preprepareMessage
        };
        const actualMessage: NewViewMessage = messagesFactory.createNewViewMessage(term, view, preprepareMessage, votes);
        expect(actualMessage).to.deep.equal(expectedMessage);
    });
});