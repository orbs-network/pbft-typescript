import { Logger } from "../../src/logger/Logger";
import { SilentLogger } from "../logger/SilentLogger";
import { GossipDiscovery } from "./GossipDiscovery";
import { Payload } from "../../src/networkCommunication/Payload";

type GossipCallback = (messageType: string, payload: any) => void;
type SubscriptionsValue = {
    cb: GossipCallback;
};

export class Gossip {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteListPKs: string[];
    private inComingWhiteListPKs: string[];

    constructor(private discovery: GossipDiscovery, private logger: Logger = new SilentLogger()) {
    }

    onRemoteMessage(message: string, payload: Payload): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteListPKs !== undefined) {
                if (this.inComingWhiteListPKs.indexOf(payload.pk) === -1) {
                    return;
                }
            }
            this.logger.log({ Subject: "GossipReceive", senderPk: payload.pk, payload });
            subscription.cb(message, payload);
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

    broadcast(message: string, payload: Payload): void {
        const targetsIds = this.discovery.getAllGossipsPks();
        targetsIds.forEach(targetId => this.unicast(targetId, message, payload));
    }

    multicast(targetsIds: string[], message: string, payload: Payload): void {
        targetsIds.forEach(targetId => this.unicast(targetId, message, payload));
    }

    unicast(pk: string, message: string, payload: Payload): void {
        if (this.outGoingWhiteListPKs !== undefined) {
            if (this.outGoingWhiteListPKs.indexOf(pk) === -1) {
                return;
            }
        }
        const targetGossip = this.discovery.getGossipByPk(pk);
        if (targetGossip) {
            this.logger.log({ Subject: "GossipSend", message, targetId: pk, payload });
            targetGossip.onRemoteMessage(message, payload);
        }
    }
}