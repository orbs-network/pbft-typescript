import { GossipDiscovery } from "./GossipDiscovery";
import { deserializeMessageContent, MessageType } from "../../src/networkCommunication/Messages";
import * as sinon from "sinon";
import { fromGossipMessage } from "../networkCommunication/InMemoryNetworkCommunicaiton";

type GossipCallback = (message: string) => void;
type SubscriptionsValue = {
    cb: GossipCallback;
};

export const gossipMessageCounter = (spy: sinon.SinonSpy, messageType: MessageType) => {
    return spy.getCalls()
        .map(c => c.args[1])
        .map(c => JSON.parse(c))
        .map(c => deserializeMessageContent(c.content))
        .filter(c => c.signedHeader.messageType === messageType).length;
};

export class Gossip {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteListPKs: string[];
    private inComingWhiteListPKs: string[];

    constructor(private discovery: GossipDiscovery) {
    }

    onRemoteMessage(gossipMessage: string): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteListPKs !== undefined) {
                const message = fromGossipMessage(gossipMessage);
                const content = deserializeMessageContent(message.content);
                if (this.inComingWhiteListPKs.indexOf(content.sender.senderPublicKey) === -1) {
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