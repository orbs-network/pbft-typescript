import { CommitMessage, deserializeMessageContent, NewViewMessage, PrepareMessage, PrePrepareMessage, serializeMessageContent, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { ConsensusRawMessage, NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { BlockMock } from "../builders/BlockBuilder";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";

export function messageToGossip(message: PrePrepareMessage | PrepareMessage | CommitMessage | ViewChangeMessage | NewViewMessage): string {
    const consesnsusRawMessage: ConsensusRawMessage = {
        content: serializeMessageContent(message.content),
        block: (message as any).block
    };
    return toGossipMessage(consesnsusRawMessage);
}

export function toGossipMessage(consensusRawMessage: ConsensusRawMessage): string {
    return JSON.stringify(consensusRawMessage);
}

export function fromGossipMessage(gossipMessage: string): ConsensusRawMessage {
    const { content, block } = JSON.parse(gossipMessage);
    const result: any = {
        content
    };

    if (block) {
        result.block = new BlockMock(block.height, block.body);
    }

    return result;
}

export function extractSenderPublicKeyFromGossipMessage(gossipMessage: string): string {
    const consensusRawMessage: ConsensusRawMessage = fromGossipMessage(gossipMessage);
    const content = deserializeMessageContent(consensusRawMessage.content);
    return content.sender.senderPublicKey;
}

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private cb: (consensusRawMessage: ConsensusRawMessage) => void;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((message: string) => this.onGossipMessage(message));
    }

    requestOrderedCommittee(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendMessage(pks: string[], consensusRawMessage: ConsensusRawMessage): void {
        const message = toGossipMessage(consensusRawMessage);
        this.gossip.multicast(pks, message);
    }

    registerOnMessage(cb: (consensusRawMessage: ConsensusRawMessage) => void): void {
        this.cb = cb;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }

    private onGossipMessage(message: string): void {
        if (!this.cb) {
            return;
        }

        const consensusRawMessage: ConsensusRawMessage = fromGossipMessage(message);
        this.cb(consensusRawMessage);
    }
}