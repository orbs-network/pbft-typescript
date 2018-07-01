import { CommitCallback, Gossip, NewViewCallback, PrepareCallback, PreprepareCallback, ViewChangeCallback } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryGossipDiscovery } from "./InMemoryGossipDiscovery";

type GossipCallback = PreprepareCallback | PrepareCallback | CommitCallback | NewViewCallback | ViewChangeCallback;
type SubscriptionsValue = {
    cb: (message: string, senderId: string, payload: any) => void;
};

interface RemoteListener {
    onRemoteMessage(senderId: string, message: string, payload?: any): void;
}

export class InMemoryGossip implements Gossip, RemoteListener {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteList: string[];
    private inComingWhiteList: string[];

    constructor(private discovery: InMemoryGossipDiscovery, private logger: Logger = new SilentLogger()) {
    }

    onRemoteMessage(senderId: string, message: string, payload?: any): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteList !== undefined) {
                if (this.inComingWhiteList.indexOf(senderId) === -1) {
                    return;
                }
            }
            this.logger.log({ Subject: "GossipReceive", senderId, payload });
            subscription.cb(message, senderId, payload);
        });
    }

    setOutGoingWhiteList(whiteList: string[]): void {
        this.outGoingWhiteList = whiteList;
    }

    clearOutGoingWhiteList(): any {
        this.outGoingWhiteList = undefined;
    }

    setIncomingWhiteList(whiteList: string[]): void {
        this.inComingWhiteList = whiteList;
    }

    clearIncommingWhiteList(): any {
        this.inComingWhiteList = undefined;
    }

    subscribe(cb: GossipCallback): number {
        this.totalSubscriptions++;
        this.subscriptions.set(this.totalSubscriptions, { cb });
        return this.totalSubscriptions;
    }

    unsubscribe(subscriptionToken: number): void {
        this.subscriptions.delete(subscriptionToken);
    }

    broadcast(senderId: string, message: string, payload?: any): void {
        this.multicast(senderId, this.discovery.getAllGossipsIds(), message, payload);
    }

    multicast(senderId: string, targetsIds: string[], message: string, payload?: any): void {
        targetsIds.forEach(targetId => this.unicast(senderId, targetId, message, payload));
    }

    unicast(senderId: string, targetId: string, message: string, payload?: any): void {
        if (this.outGoingWhiteList !== undefined) {
            if (this.outGoingWhiteList.indexOf(targetId) === -1) {
                return;
            }
        }
        const targetGossip = this.discovery.getGossipById(targetId);
        if (targetGossip) {
            this.logger.log({ Subject: "GossipSend", message, senderId, targetId, payload });
            targetGossip.onRemoteMessage(senderId, message, payload);
        }
    }
}