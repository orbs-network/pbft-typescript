import { KeyManager, Block } from "../../src";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { PrePrepareMessage, BlockRef, MessageType, SenderSignature, PrepareMessage, CommitMessage, PreparedProof, ViewChangeMessage, ViewChangeHeader, ViewChangeConfirmation, NewViewMessage, NewViewHeader } from "../../src/networkCommunication/Messages";

export class MessagesFactoryMock {
    constructor(private keyManager: KeyManager) { }

    createPreprepareMessage(blockHeight: number, view: number, block: Block): PrePrepareMessage {
        const signedHeader: BlockRef = { messageType: MessageType.PREPREPARE, blockHeight, view, blockHash: block.getBlockHash() };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return {
            signedHeader,
            sender,
            block
        };
    }

    createPrepareMessage(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage {
        const signedHeader: BlockRef = { messageType: MessageType.PREPARE, blockHeight, view, blockHash };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return { sender, signedHeader };
    }

    createCommitMessage(blockHeight: number, view: number, blockHash: Buffer): CommitMessage {
        const signedHeader: BlockRef = { messageType: MessageType.COMMIT, blockHeight, view, blockHash };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return { sender, signedHeader };
    }

    private generatePreparedProof(prepared: PreparedMessages): PreparedProof {
        const { preprepareMessage, prepareMessages } = prepared;
        return {
            preprepareBlockRefMessage: {
                signedHeader: preprepareMessage.signedHeader,
                sender: preprepareMessage.sender
            },
            prepareBlockRefMessages: prepareMessages
        };
    }

    createViewChangeMessage(blockHeight: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage {
        let preparedProof: PreparedProof;
        let block: Block;
        if (preparedMessages) {
            preparedProof = this.generatePreparedProof(preparedMessages);
            block = preparedMessages.preprepareMessage.block;
        }

        const signedHeader: ViewChangeHeader = { messageType: MessageType.VIEW_CHANGE, blockHeight, view, preparedProof };
        const sender: SenderSignature = this.keyManager.signViewChange(signedHeader);
        return {
            signedHeader,
            sender,
            block
        };
    }

    createNewViewMessage(blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeConfirmation[]): NewViewMessage {
        const signedHeader: NewViewHeader = { messageType: MessageType.NEW_VIEW, blockHeight, view, viewChangeConfirmations };
        const sender: SenderSignature = this.keyManager.signNewView(signedHeader);
        return {
            signedHeader,
            sender,
            preprepareMessage
        };
    }
}