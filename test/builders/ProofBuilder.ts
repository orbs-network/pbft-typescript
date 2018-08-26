import { Block } from "../../src";
import { BlockMessageContent, MessageType, PreparedProof, SignaturePair, PrePrepareMessage, PrepareMessage, BlockRefMessage } from "../../src/networkCommunication/Messages";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { Node } from "../network/Node";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { aPrePrepareMessage, aPrepareMessage, blockRefMessageFromPP } from "./MessagesBuilder";

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

    const preprepareBlockRefMessage: BlockRefMessage = {
        content: PPContent,
        signaturePair: {
            contentSignature: leader.config.keyManager.sign(PPContent),
            signerPublicKey: leader.config.keyManager.getMyPublicKey()
        }
    };

    const prepareBlockRefMessages: BlockRefMessage[] = members.map(member => {
        return {
            content: PContent,
            signaturePair: {
                contentSignature: member.config.keyManager.sign(PContent),
                signerPublicKey: member.config.keyManager.getMyPublicKey()
            }
        };
    });

    return {
        preprepareBlockRefMessage,
        prepareBlockRefMessages
    };
}

export function aPreparedProofByMessages(PPMessage: PrePrepareMessage, PMessages: PrepareMessage[]): PreparedProof {
    return {
        preprepareBlockRefMessage: blockRefMessageFromPP(PPMessage),
        prepareBlockRefMessages: PMessages
    };
}

export function aPrepared(leader: Node, members: Node[], term: number, view: number, block: Block): PreparedMessages {
    const result: PreparedMessages = {
        preprepareMessage: aPrePrepareMessage(leader.config.keyManager, term, view, block),
        prepareMessages: members.map(m => aPrepareMessage(m.config.keyManager, term, view, block))
    };

    return result;
}
