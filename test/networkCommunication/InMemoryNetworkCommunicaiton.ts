import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { Block } from "../../src";
import { BlockMock } from "../builders/BlockBuilder";
import { PrePrepareMessage, PrepareMessage, CommitMessage, ViewChangeMessage, NewViewMessage, serializeMessageContent } from "../../src/networkCommunication/Messages";

export function messageToGossip(message: PrePrepareMessage | PrepareMessage | CommitMessage | ViewChangeMessage | NewViewMessage): string {
    return toGossipMessage(serializeMessageContent(message.content), (message as any).block);
}

export function toGossipMessage(content: string, block?: Block): string {
    const message = JSON.stringify({ content, block });
    return message;
}

export function fromGossipMessage(gossipMessage: string): { content: string, block?: Block } {
    const { content, block } = JSON.parse(gossipMessage);
    const result: any = {
        content
    };

    if (block) {
        result.block = new BlockMock(block.height, block.body);
    }

    return result;
}

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private cb: (content: string, block?: Block) => void;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((message: string) => this.onGossipMessage(message));
    }

    requestOrderedCommittee(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendMessage(pks: string[], content: string, block?: Block): void {
        const message = toGossipMessage(content, block);
        this.gossip.multicast(pks, message);
    }

    registerOnMessage(cb: (content: string, block?: Block) => void): void {
        this.cb = cb;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }

    private onGossipMessage(message: string): void {
        if (!this.cb) {
            return;
        }

        const { content, block } = fromGossipMessage(message);
        this.cb(content, block);
    }
}