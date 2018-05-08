import { Gossip, GossipCallback } from "./Gossip";

type SubscriptionsValue = {
    message: string;
    cb: GossipCallback;
};

interface RemoteListener {
    onRemoteMessage(message: string, payload?: any): void;
}

export class InMemoryGossip implements Gossip, RemoteListener {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private remoteMessagesListeners: Map<string, RemoteListener> = new Map();

    registerRemoteMessagesListener(id: string, listener: RemoteListener): void {
        this.remoteMessagesListeners.set(id, listener);
    }

    onRemoteMessage(message: string, payload?: any): void {
        this.subscriptions.forEach(subscription => {
            if (subscription.message === message) {
                subscription.cb(payload);
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
        this.remoteMessagesListeners.forEach(listener => listener.onRemoteMessage(message, payload));
    }

    unicast(nodeId: string, message: string, payload?: any): void {
        this.remoteMessagesListeners.forEach((listener, key) => {
            if (key === nodeId) {
                listener.onRemoteMessage(message, payload);
            }
        });
    }
}