import { BlockUtils } from "../blockUtils/BlockUtils";
import { KeyManager } from "../keyManager/KeyManager";
import { Block } from "../Block";
import { SenderSignature, BlockMessageContent, MessageType, PrePrepareMessage, PrepareMessage, CommitMessage, ViewChangeMessage, ViewChangeMessageContent, PreparedProof, ViewChangeConfirmation, NewViewMessage, NewViewContent } from "./Messages";
import { PreparedMessages } from "../storage/PBFTStorage";

export class MessagesFactory {
    private myPk: string;
    constructor(private calculateBlockHash: (block: Block) => Buffer, private keyManager: KeyManager) {
        this.myPk = keyManager.getMyPublicKey();
    }

    createPreprepareMessage(term: number, view: number, block: Block): PrePrepareMessage {
        const blockHash: Buffer = this.calculateBlockHash(block);
        const signedHeader: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
        const signer: SenderSignature = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            signer,
            block
        };
    }

    createPrepareMessage(term: number, view: number, blockHash: Buffer): PrepareMessage {
        const signedHeader: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
        const signer: SenderSignature = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(signedHeader)
        };
        return { signer, signedHeader };
    }

    createCommitMessage(term: number, view: number, blockHash: Buffer): CommitMessage {
        const signedHeader: BlockMessageContent = { messageType: MessageType.COMMIT, term, view, blockHash };
        const signer: SenderSignature = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(signedHeader)
        };
        return { signer, signedHeader };
    }

    private generatePreparedProof(prepared: PreparedMessages): PreparedProof {
        const { preprepareMessage, prepareMessages } = prepared;
        return {
            preprepareBlockRefMessage: {
                signedHeader: preprepareMessage.signedHeader,
                signer: preprepareMessage.signer
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

        const signedHeader: ViewChangeMessageContent = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof };
        const signer: SenderSignature = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            signer,
            block
        };
    }

    createNewViewMessage(term: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeConfirmations: ViewChangeConfirmation[]): NewViewMessage {
        const signedHeader: NewViewContent = { messageType: MessageType.NEW_VIEW, term, view, viewChangeConfirmations };
        const signer: SenderSignature = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(signedHeader)
        };
        return {
            signedHeader,
            signer,
            preprepareMessage
        };
    }
}