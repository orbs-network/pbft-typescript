import { Block } from "../../src";
import { BlockMessageContent, MessageType, PreparedProof, SignaturePair, PrePrepareMessage, PrepareMessage } from "../../src/networkCommunication/Messages";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { Node } from "../network/Node";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { aPrePrepareMessage, aPrepareMessage } from "./MessagesBuilder";

export function aPreparedProof(leader: Node, members: Node[], term: number, view: number, block: Block): PreparedProof {
    const blockHash: Buffer = calculateBlockHash(block);

    const PPContent: BlockMessageContent = {
        messageType: MessageType.PREPREPARE,
        term,
        view,
        blockHash
    };
    const PContent: BlockMessageContent = {
        messageType: MessageType.PREPARE,
        term,
        view,
        blockHash
    };
    const preprepareMessageSignature: SignaturePair = {
        contentSignature: leader.config.keyManager.sign(PPContent),
        signerPublicKey: leader.config.keyManager.getMyPublicKey()
    };

    const prepareMessagesSignatures: SignaturePair[] = members.map(member => {
        return {
            contentSignature: member.config.keyManager.sign(PContent),
            signerPublicKey: member.config.keyManager.getMyPublicKey()
        };
    });

    return { blockHash, term, view, preprepareMessageSignature, prepareMessagesSignatures };
}

export function aPreparedProofByMessages(PPMessage: PrePrepareMessage, PMessages: PrepareMessage[]): PreparedProof {
    return {
        blockHash: PPMessage.content.blockHash,
        term: PPMessage.content.term,
        view: PPMessage.content.view,
        preprepareMessageSignature: PPMessage.signaturePair,
        prepareMessagesSignatures: PMessages.map(p => p.signaturePair)
    };
}

export function aPrepared(leader: Node, members: Node[], term: number, view: number, block: Block): PreparedMessages {
    const result: PreparedMessages = {
        preprepareMessage: aPrePrepareMessage(leader.config.keyManager, term, view, block),
        prepareMessages: members.map(m => aPrepareMessage(m.config.keyManager, term, view, block))
    };

    return result;
}
