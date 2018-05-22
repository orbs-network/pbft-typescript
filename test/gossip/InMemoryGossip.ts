import { Gossip, NewViewCallback, PrepareCallback, PreprepareCallback, ViewChangeCallback } from "../../src/gossip/Gossip";

type GossipCallback = PreprepareCallback | PrepareCallback | NewViewCallback | ViewChangeCallback;
type SubscriptionsValue = {
    message: string;
    cb: (senderId: string, payload: any) => void;
};

interface RemoteListener {
    id: string;
    onRemoteMessage(senderId: string, message: string, payload?: any): void;
}

export class InMemoryGossip implements Gossip, RemoteListener {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private remoteMessagesListeners: Map<string, RemoteListener> = new Map();

    constructor(public id: string) {
    }

    registerRemoteMessagesListener(listener: RemoteListener): void {
        this.remoteMessagesListeners.set(listener.id, listener);
    }

    onRemoteMessage(senderId: string, message: string, payload?: any): void {
        this.subscriptions.forEach(subscription => {
            if (subscription.message === message) {
                subscription.cb(senderId, payload);
            }
        });
    }

    subscribe(message: string, cb: GossipCallback): number {
        this.totalSubscriptions++;
        this.subscriptions.set(this.totalSubscriptions, { message, cb });
        return this.totalSubscriptions;
    }

    unsubscribe(subscriptionToken: number): void {
        this.subscriptions.delete(subscriptionToken);
    }

    broadcast(message: string, payload?: any): void {
        this.remoteMessagesListeners.forEach(listener => listener.onRemoteMessage(this.id, message, payload));
    }

    unicast(nodeId: string, message: string, payload?: any): void {
        this.remoteMessagesListeners.forEach((listener, key) => {
            if (key === nodeId) {
                listener.onRemoteMessage(this.id, message, payload);
            }
        });
    }
}