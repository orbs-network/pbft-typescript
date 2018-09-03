import { BlockUtils } from "../blockUtils/BlockUtils";
import { KeyManager } from "../keyManager/KeyManager";
import { Block } from "../Block";
import { SignaturePair, BlockMessageContent, MessageType, PrePrepareMessage, PrepareMessage, CommitMessage, ViewChangeMessage, ViewChangeMessageContent, PreparedProof, ViewChangeVote, NewViewMessage, NewViewContent } from "./Messages";
import { PreparedMessages } from "../storage/PBFTStorage";

export class MessagesFactory {
    private myPk: string;
    constructor(private calculateBlockHash: (block: Block) => Buffer, private keyManager: KeyManager) {
        this.myPk = keyManager.getMyPublicKey();
    }

    createPreprepareMessage(term: number, view: number, block: Block): PrePrepareMessage {
        const blockHash: Buffer = this.calculateBlockHash(block);
        const content: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
        const signaturePair: SignaturePair = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(content)
        };
        return {
            content,
            signaturePair,
            block
        };
    }

    createPrepareMessage(term: number, view: number, blockHash: Buffer): PrepareMessage {
        const content: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
        const signaturePair: SignaturePair = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(content)
        };
        return { signaturePair, content };
    }

    createCommitMessage(term: number, view: number, blockHash: Buffer): CommitMessage {
        const content: BlockMessageContent = { messageType: MessageType.COMMIT, term, view, blockHash };
        const signaturePair: SignaturePair = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(content)
        };
        return { signaturePair, content };
    }

    private generatePreparedProof(prepared: PreparedMessages): PreparedProof {
        const { preprepareMessage, prepareMessages } = prepared;
        return {
            preprepareBlockRefMessage: {
                content: preprepareMessage.content,
                signaturePair: preprepareMessage.signaturePair
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

        const content: ViewChangeMessageContent = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof };
        const signaturePair: SignaturePair = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(content)
        };
        return {
            content,
            signaturePair,
            block
        };
    }

    createNewViewMessage(term: number, view: number, preprepareMessage: PrePrepareMessage, votes: ViewChangeVote[]): NewViewMessage {
        const content: NewViewContent = { messageType: MessageType.NEW_VIEW, term, view, votes };
        const signaturePair: SignaturePair = {
            signerPublicKey: this.myPk,
            contentSignature: this.keyManager.sign(content)
        };
        return {
            content,
            signaturePair,
            preprepareMessage
        };
    }
}