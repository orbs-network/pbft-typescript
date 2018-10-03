import { Block } from "../../src";
import { BlockRef, MessageType, PreparedProof, SenderSignature, PrePrepareMessage, PrepareMessage, BlockRefMessage } from "../../src/networkCommunication/Messages";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { Node } from "../network/Node";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { aPrePrepareMessage, aPrepareMessage, blockRefMessageFromPP } from "./MessagesBuilder";

export function aPreparedProof(leader: Node, members: Node[], blockHeight: number, view: number, block: Block): PreparedProof {
    const blockHash: Buffer = calculateBlockHash(block);

    const PPContent: BlockRef = {
        messageType: MessageType.PREPREPARE,
        blockHeight,
        view,
        blockHash
    };
    const PContent: BlockRef = {
        messageType: MessageType.PREPARE,
        blockHeight,
        view,
        blockHash
    };

    const preprepareBlockRefMessage: BlockRefMessage = {
        signedHeader: PPContent,
        sender: {
            signature: leader.config.keyManager.sign(PPContent),
            senderPublicKey: leader.config.keyManager.getMyPublicKey()
        }
    };

    const prepareBlockRefMessages: BlockRefMessage[] = members.map(member => {
        return {
            signedHeader: PContent,
            sender: {
                signature: member.config.keyManager.sign(PContent),
                senderPublicKey: member.config.keyManager.getMyPublicKey()
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

export function aPrepared(leader: Node, members: Node[], blockHeight: number, view: number, block: Block): PreparedMessages {
    const result: PreparedMessages = {
        preprepareMessage: aPrePrepareMessage(leader.config.keyManager, blockHeight, view, block),
        prepareMessages: members.map(m => aPrepareMessage(m.config.keyManager, blockHeight, view, block))
    };

    return result;
}
