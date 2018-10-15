import { KeyManager, Block } from "..";
import { PrePrepareMessage, BlockRef, MessageType, SenderSignature, PrepareMessage, CommitMessage, PreparedProof, ViewChangeMessage, ViewChangeHeader, NewViewMessage, NewViewHeader, ViewChangeContent } from "./Messages";
import { PreparedMessages } from "../storage/PreparedMessagesExtractor";

export class MessagesFactory {
    constructor(private keyManager: KeyManager) { }

    createPreprepareMessage(blockHeight: number, view: number, block: Block): PrePrepareMessage {
        const signedHeader: BlockRef = { messageType: MessageType.PREPREPARE, blockHeight, view, blockHash: block.getBlockHash() };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return {
            content: {
                signedHeader,
                sender,
            },
            block
        };
    }

    createPrepareMessage(blockHeight: number, view: number, blockHash: Buffer): PrepareMessage {
        const signedHeader: BlockRef = { messageType: MessageType.PREPARE, blockHeight, view, blockHash };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return {
            content: {
                sender,
                signedHeader
            }
        };
    }

    createCommitMessage(blockHeight: number, view: number, blockHash: Buffer): CommitMessage {
        const signedHeader: BlockRef = { messageType: MessageType.COMMIT, blockHeight, view, blockHash };
        const sender: SenderSignature = this.keyManager.signBlockRef(signedHeader);
        return {
            content: {
                sender,
                signedHeader
            }
        };
    }

    private generatePreparedProof(prepared: PreparedMessages): PreparedProof {
        const { preprepareMessage, prepareMessages } = prepared;
        return {
            preprepareBlockRef: preprepareMessage ? preprepareMessage.content.signedHeader : undefined,
            preprepareSender: preprepareMessage ? preprepareMessage.content.sender : undefined,
            prepareBlockRef: prepareMessages ? prepareMessages[0].content.signedHeader : undefined,
            prepareSenders: prepareMessages ? prepareMessages.map(m => m.content.sender) : undefined
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
            content: {
                signedHeader,
                sender,
            },
            block
        };
    }

    createNewViewMessage(blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeContent[]): NewViewMessage {
        const signedHeader: NewViewHeader = { messageType: MessageType.NEW_VIEW, blockHeight, view, viewChangeConfirmations };
        const sender: SenderSignature = this.keyManager.signNewView(signedHeader);
        return {
            content: {
                signedHeader,
                sender,
                preprepareContent: preprepareMessage.content
            },
            block: preprepareMessage.block
        };
    }
}