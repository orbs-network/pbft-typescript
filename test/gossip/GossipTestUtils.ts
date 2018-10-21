import * as sinon from "sinon";
import { CommitMessage, deserializeMessageContent, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, serializeMessageContent, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { ConsensusRawMessage } from "../../src/networkCommunication/NetworkCommunication";

export const gossipMessageCounter = (spy: sinon.SinonSpy, messageType: MessageType) => {
    return spy.getCalls()
        .map(c => c.args[1])
        .map(c => deserializeMessageContent(c.content))
        .filter(c => c.signedHeader.messageType === messageType).length;
};

export function extractSenderPublicKeyFromConsensusRawMessage(consensusRawMessage: ConsensusRawMessage): string {
    const content = deserializeMessageContent(consensusRawMessage.content);
    return content.sender.senderPublicKey;
}

export function messageToGossip(message: PrePrepareMessage | PrepareMessage | CommitMessage | ViewChangeMessage | NewViewMessage): ConsensusRawMessage {
    return {
        messageType: message.content.signedHeader.messageType,
        content: serializeMessageContent(message.content),
        block: (message as any).block
    };
}
