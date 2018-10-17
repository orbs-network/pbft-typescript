import * as sinon from "sinon";
import { CommitMessage, deserializeMessageContent, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, serializeMessageContent, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { ConsensusRawMessage } from "../../src/networkCommunication/NetworkCommunication";
import { fromGossipMessage, toGossipMessage } from "./Gossip";

export const gossipMessageCounter = (spy: sinon.SinonSpy, messageType: MessageType) => {
    return spy.getCalls()
        .map(c => c.args[1])
        .map(c => JSON.parse(c))
        .map(c => deserializeMessageContent(c.content))
        .filter(c => c.signedHeader.messageType === messageType).length;
};

export function extractSenderPublicKeyFromGossipMessage(gossipMessage: string): string {
    const consensusRawMessage: ConsensusRawMessage = fromGossipMessage(gossipMessage);
    const content = deserializeMessageContent(consensusRawMessage.content);
    return content.sender.senderPublicKey;
}

export function messageToGossip(message: PrePrepareMessage | PrepareMessage | CommitMessage | ViewChangeMessage | NewViewMessage): string {
    const consesnsusRawMessage: ConsensusRawMessage = {
        content: serializeMessageContent(message.content),
        block: (message as any).block
    };
    return toGossipMessage(consesnsusRawMessage);
}
