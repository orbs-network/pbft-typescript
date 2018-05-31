import { Gossip, NewViewCallback, PrepareCallback, PreprepareCallback, ViewChangeCallback } from "../../src/gossip/Gossip";
import { InMemoryGossipDiscovery } from "./InMemoryGossipDiscovery";

type GossipCallback = PreprepareCallback | PrepareCallback | NewViewCallback | ViewChangeCallback;
type SubscriptionsValue = {
    message: string;
    cb: (senderId: string, payload: any) => void;
};

interface RemoteListener {
    onRemoteMessage(senderId: string, message: string, payload?: any): void;
}

export class InMemoryGossip implements Gossip, RemoteListener {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteList: string[] = [];
    private inComingWhiteList: string[] = [];

    constructor(private discovery: InMemoryGossipDiscovery) {
    }

    onRemoteMessage(senderId: string, message: string, payload?: any): void {
        this.subscriptions.forEach(subscription => {
            if (subscription.message === message) {
                if (this.inComingWhiteList.length > 0) {
                    if (this.inComingWhiteList.indexOf(senderId) === -1) {
                        return;
                    }
                }
                subscription.cb(senderId, payload);
            }
        });
    }

    setOutGoingWhiteList(whiteList: string[]): void {
        this.outGoingWhiteList = whiteList;
    }

    setIncomingWhiteList(whiteList: string[]): void {
        this.inComingWhiteList = whiteList;
    }

    subscribe(message: string, cb: GossipCallback): number {
        this.totalSubscriptions++;
        this.subscriptions.set(this.totalSubscriptions, { message, cb });
        return this.totalSubscriptions;
    }

    unsubscribe(subscriptionToken: number): void {
        this.subscriptions.delete(subscriptionToken);
    }

    broadcast(senderId: string, message: string, payload?: any): void {
        this.discovery.getGossips(this.outGoingWhiteList).forEach(gossip => {
            if (gossip !== this) {
                gossip.onRemoteMessage(senderId, message, payload);
            }
        });
    }

    multicast(senderId: string, targetsIds: string[], message: string, payload?: any): void {
        targetsIds.forEach(targetId => this.unicast(senderId, targetId, message, payload));
    }

    unicast(senderId: string, targetId: string, message: string, payload?: any): void {
        if (this.outGoingWhiteList.length > 0) {
            if (this.outGoingWhiteList.indexOf(targetId) === -1) {
                return;
            }
        }
        const targetGossip = this.discovery.getGossipById(targetId);
        if (targetGossip) {
            targetGossip.onRemoteMessage(senderId, message, payload);
        }
    }

    private isInWhiteList(senderId: string, targetId: string, message: string): boolean {
        return false;
    }
}