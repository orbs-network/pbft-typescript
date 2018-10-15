import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { Block } from "../../src";
import { BlockMock } from "../builders/BlockBuilder";
import { PrePrepareMessage, PrepareMessage, CommitMessage, ViewChangeMessage, NewViewMessage, serializeMessage } from "../../src/networkCommunication/Messages";

export function messageToGossip(message: PrePrepareMessage | PrepareMessage | CommitMessage | ViewChangeMessage | NewViewMessage): string {
    return toGossipMessage(serializeMessage(message.content), (message as any).block);
}

export function toGossipMessage(messageContent: string, block?: Block): string {
    const message = JSON.stringify({ messageContent, block });
    return message;
}

export function fromGossipMessage(gossipMessage: string): { messageContent: string, block?: Block } {
    const { messageContent, block } = JSON.parse(gossipMessage);
    const result: any = {
        messageContent
    };

    if (block) {
        result.block = new BlockMock(block.height, block.body);
    }

    return result;
}

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private cb: (messageContent: string, block?: Block) => void;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((message: string) => this.onGossipMessage(message));
    }

    requestOrderedCommittee(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendMessage(pks: string[], messageContent: string, block?: Block): void {
        const message = toGossipMessage(messageContent, block);
        this.gossip.multicast(pks, message);
    }

    registerOnMessage(cb: (messageContent: string, block?: Block) => void): void {
        this.cb = cb;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }

    private onGossipMessage(message: string): void {
        if (!this.cb) {
            return;
        }

        const { messageContent, block } = fromGossipMessage(message);
        this.cb(messageContent, block);
    }
}