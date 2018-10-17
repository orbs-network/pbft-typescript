import { ConsensusRawMessage, NetworkCommunication, NetworkCommunicationCallback } from "../../src/networkCommunication/NetworkCommunication";
import { BlockMock } from "../builders/BlockBuilder";
import { GossipDiscovery } from "./GossipDiscovery";
import { extractSenderPublicKeyFromConsensusRawMessage } from "./GossipTestUtils";

type SubscriptionsValue = {
    cb: NetworkCommunicationCallback;
};

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


export class Gossip implements NetworkCommunication {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteListPKs: string[];
    private inComingWhiteListPKs: string[];

    constructor(private discovery: GossipDiscovery) {
    }

    requestOrderedCommittee(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }

    sendMessage(pks: string[], consensusRawMessage: ConsensusRawMessage): void {
        pks.forEach(pk => this.sendToNode(pk, consensusRawMessage));
    }

    registerOnMessage(cb: (consensusRawMessage: ConsensusRawMessage) => void): number {
        this.totalSubscriptions++;
        this.subscriptions.set(this.totalSubscriptions, { cb });
        return this.totalSubscriptions;
    }

    unRegisterOnMessage(subscriptionToken: number): void {
        this.subscriptions.delete(subscriptionToken);
    }






    onRemoteMessage(gossipMessage: ConsensusRawMessage): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteListPKs !== undefined) {
                const senderPublicKey = extractSenderPublicKeyFromConsensusRawMessage(gossipMessage);
                if (this.inComingWhiteListPKs.indexOf(senderPublicKey) === -1) {
                    return;
                }
            }
            subscription.cb(gossipMessage);
        });
    }

    setOutGoingWhiteListPKs(whiteListPKs: string[]): void {
        this.outGoingWhiteListPKs = whiteListPKs;
    }

    clearOutGoingWhiteListPKs(): any {
        this.outGoingWhiteListPKs = undefined;
    }

    setIncomingWhiteListPKs(whiteListPKs: string[]): void {
        this.inComingWhiteListPKs = whiteListPKs;
    }

    clearIncommingWhiteListPKs(): any {
        this.inComingWhiteListPKs = undefined;
    }

    sendToNode(pk: string, consensusRawMessage: ConsensusRawMessage): void {
        if (this.outGoingWhiteListPKs !== undefined) {
            if (this.outGoingWhiteListPKs.indexOf(pk) === -1) {
                return;
            }
        }
        const targetGossip = this.discovery.getGossipByPk(pk);
        if (targetGossip) {
            targetGossip.onRemoteMessage(consensusRawMessage);
        }
    }
}