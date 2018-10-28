import { Block } from "../../src";
import { BlockRef, MessageType, PreparedProof, SenderSignature, PrePrepareMessage, PrepareMessage, BlockRefContent } from "../../src/networkCommunication/Messages";
import { Node } from "../network/Node";
import { aPrePrepareMessage, aPrepareMessage, blockRefMessageFromPP } from "./MessagesBuilder";
import { PreparedMessages } from "../../src/storage/PreparedMessagesExtractor";

export function aPreparedProof(leader: Node, members: Node[], blockHeight: number, view: number, block: Block): PreparedProof {
    const blockHash: Buffer = block.getBlockHash();

    const preprepareBlockRef: BlockRef = {
        messageType: MessageType.PREPREPARE,
        blockHeight,
        view,
        blockHash
    };
    const prepareBlockRef: BlockRef = {
        messageType: MessageType.PREPARE,
        blockHeight,
        view,
        blockHash
    };

    return {
        preprepareBlockRef,
        preprepareSender: {
            senderPublicKey: leader.config.keyManager.getMyPublicKey(),
            signature: leader.config.keyManager.sign(JSON.stringify(preprepareBlockRef))
        },
        prepareBlockRef,
        prepareSenders: members.map(member => {
            return {
                senderPublicKey: member.config.keyManager.getMyPublicKey(),
                signature: member.config.keyManager.sign(JSON.stringify(prepareBlockRef))
            };
        })
    };
}

export function aPreparedProofByMessages(PPMessage: PrePrepareMessage, PMessages: PrepareMessage[]): PreparedProof {
    return {
        preprepareBlockRef: PPMessage ? PPMessage.content.signedHeader : undefined,
        preprepareSender: PPMessage ? PPMessage.content.sender : undefined,
        prepareBlockRef: PMessages ? PMessages[0].content.signedHeader : undefined,
        prepareSenders: PMessages ? PMessages.map(m => m.content.sender) : undefined
    };
}

export function aPrepared(leader: Node, members: Node[], blockHeight: number, view: number, block: Block): PreparedMessages {
    const result: PreparedMessages = {
        preprepareMessage: aPrePrepareMessage(leader.config.keyManager, blockHeight, view, block),
        prepareMessages: members.map(m => aPrepareMessage(m.config.keyManager, blockHeight, view, block))
    };

    return result;
}
