import { BlockUtils } from "../blockUtils/BlockUtils";
import { KeyManager } from "../keyManager/KeyManager";
import { Block } from "../Block";
import { SenderSignature, BlockRef, MessageType, PrePrepareMessage, PrepareMessage, CommitMessage, ViewChangeMessage, ViewChangeHeader, PreparedProof, ViewChangeConfirmation, NewViewMessage, NewViewHeader } from "./Messages";
import { PreparedMessages } from "../storage/PBFTStorage";

export class MessagesFactory {
    private myPk: string;
    constructor(private calculateBlockHash: (block: Block) => Buffer, private keyManager: KeyManager) {
        this.myPk = keyManager.getMyPublicKey();
    }

    createPreprepareMessage(term: number, view: number, block: Block): PrePrepareMessage {
        const blockHash: Buffer = this.calculateBlockHash(block);
        const signedHeader: BlockRef = { messageType: MessageType.PREPREPARE, term, view, blockHash };
        const sender: SenderSignature = {
            senderPublicKey: this.myPk,
            signature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            sender,
            block
        };
    }

    createPrepareMessage(term: number, view: number, blockHash: Buffer): PrepareMessage {
        const signedHeader: BlockRef = { messageType: MessageType.PREPARE, term, view, blockHash };
        const sender: SenderSignature = {
            senderPublicKey: this.myPk,
            signature: this.keyManager.sign(signedHeader)
        };
        return { sender, signedHeader };
    }

    createCommitMessage(term: number, view: number, blockHash: Buffer): CommitMessage {
        const signedHeader: BlockRef = { messageType: MessageType.COMMIT, term, view, blockHash };
        const sender: SenderSignature = {
            senderPublicKey: this.myPk,
            signature: this.keyManager.sign(signedHeader)
        };
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

    createViewChangeMessage(term: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage {
        let preparedProof: PreparedProof;
        let block: Block;
        if (preparedMessages) {
            preparedProof = this.generatePreparedProof(preparedMessages);
            block = preparedMessages.preprepareMessage.block;
        }

        const signedHeader: ViewChangeHeader = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof };
        const sender: SenderSignature = {
            senderPublicKey: this.myPk,
            signature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            sender,
            block
        };
    }

    createNewViewMessage(term: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeConfirmation[]): NewViewMessage {
        const signedHeader: NewViewHeader = { messageType: MessageType.NEW_VIEW, term, view, viewChangeConfirmations };
        const sender: SenderSignature = {
            senderPublicKey: this.myPk,
            signature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            sender,
            preprepareMessage
        };
    }
}