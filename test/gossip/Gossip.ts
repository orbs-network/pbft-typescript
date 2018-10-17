import { ConsensusRawMessage, NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { BlockMock } from "../builders/BlockBuilder";
import { GossipDiscovery } from "./GossipDiscovery";
import { extractSenderPublicKeyFromGossipMessage } from "./GossipTestUtils";

type GossipCallback = (message: string) => void;
type SubscriptionsValue = {
    cb: GossipCallback;
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

    sendMessage(pks: string[], consensusRawMessage: ConsensusRawMessage): void {
        const message = toGossipMessage(consensusRawMessage);
        this.multicast(pks, message);
    }

    registerOnMessage(cb: (consensusRawMessage: ConsensusRawMessage) => void): void {
        this.subscribe(msg => cb(fromGossipMessage(msg)));
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }






    onRemoteMessage(gossipMessage: string): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteListPKs !== undefined) {
                const senderPublicKey = extractSenderPublicKeyFromGossipMessage(gossipMessage);
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

    subscribe(cb: GossipCallback): number {
        this.totalSubscriptions++;
        this.subscriptions.set(this.totalSubscriptions, { cb });
        return this.totalSubscriptions;
    }

    unsubscribe(subscriptionToken: number): void {
        this.subscriptions.delete(subscriptionToken);
    }

    multicast(targetsIds: string[], message: string): void {
        targetsIds.forEach(targetId => this.unicast(targetId, message));
    }

    unicast(pk: string, message: string): void {
        if (this.outGoingWhiteListPKs !== undefined) {
            if (this.outGoingWhiteListPKs.indexOf(pk) === -1) {
                return;
            }
        }
        const targetGossip = this.discovery.getGossipByPk(pk);
        if (targetGossip) {
            targetGossip.onRemoteMessage(message);
        }
    }
}