import { Block, KeyManager } from "../../src";
import { BlockMessageContent, CommitMessage, MessageType, NewViewContent, NewViewMessage, PreparedProof, PrepareMessage, PrePrepareMessage, SignaturePair, ViewChangeMessage, ViewChangeMessageContent, ViewChangeVote } from "../../src/networkCommunication/Messages";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { Prepared } from "../../src/storage/PBFTStorage";

export function aPrePrepareMessage(keyManager: KeyManager, term: number, view: number, block: Block): PrePrepareMessage {
    const blockHash: Buffer = calculateBlockHash(block);
    const content: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
    const signaturePair: SignaturePair = {
        signerPublicKey: keyManager.getMyPublicKey(),
        contentSignature: keyManager.sign(content)
    };
    return {
        content,
        signaturePair,
        block
    };
}

export function aPrepareMessage(keyManager: KeyManager, term: number, view: number, block: Block): PrepareMessage {
    const blockHash: Buffer = calculateBlockHash(block);
    const content: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
    const signaturePair: SignaturePair = {
        signerPublicKey: keyManager.getMyPublicKey(),
        contentSignature: keyManager.sign(content)
    };
    return {
        content,
        signaturePair
    };
}

export function aCommitMessage(keyManager: KeyManager, term: number, view: number, block: Block): CommitMessage {
    const blockHash: Buffer = calculateBlockHash(block);
    const content: BlockMessageContent = { messageType: MessageType.COMMIT, term, view, blockHash };
    const signaturePair: SignaturePair = {
        signerPublicKey: keyManager.getMyPublicKey(),
        contentSignature: keyManager.sign(content)
    };
    return {
        content,
        signaturePair
    };
}

function generatePreparedProof(prepared: Prepared): PreparedProof {
    const { term, view, blockHash} = prepared.preprepareMessage.content;
    return {
        term,
        view,
        blockHash,
        preprepareMessageSignature: prepared.preprepareMessage.signaturePair,
        prepareMessagesSignatures: prepared.prepareMessages ? prepared.prepareMessages.map(p => p.signaturePair) : undefined
    };
}

export function aViewChangeMessage(keyManager: KeyManager, term: number, view: number, prepared?: Prepared): ViewChangeMessage {
    let preparedProof: PreparedProof;
    let block: Block;
    if (prepared) {
        preparedProof = generatePreparedProof(prepared);
        block = prepared.preprepareMessage.block;
    }

    const content: ViewChangeMessageContent = { messageType: MessageType.VIEW_CHANGE, term, view, preparedProof };
    const signaturePair: SignaturePair = {
        signerPublicKey: keyManager.getMyPublicKey(),
        contentSignature: keyManager.sign(content)
    };
    return {
        content,
        signaturePair,
        block
    };
}

export function aNewViewMessage(keyManager: KeyManager, term: number, view: number, preprepareMessage: PrePrepareMessage, votes: ViewChangeVote[]): NewViewMessage {
    const content: NewViewContent = { messageType: MessageType.NEW_VIEW, term, view, votes };
    const signaturePair: SignaturePair = {
        signerPublicKey: keyManager.getMyPublicKey(),
        contentSignature: keyManager.sign(content)
    };
    return {
        content,
        signaturePair,
        preprepareMessage
    };
}
