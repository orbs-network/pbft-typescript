import { LeanHelixMessage } from "../../src/networkCommunication/Messages";
import { GossipDiscovery } from "./GossipDiscovery";

type GossipCallback = (message: LeanHelixMessage) => void;
type SubscriptionsValue = {
    cb: GossipCallback;
};

export class Gossip {
    private totalSubscriptions: number = 0;
    private subscriptions: Map<number, SubscriptionsValue> = new Map();
    private outGoingWhiteListPKs: string[];
    private inComingWhiteListPKs: string[];

    constructor(private discovery: GossipDiscovery) {
    }

    onRemoteMessage(message: LeanHelixMessage): void {
        this.subscriptions.forEach(subscription => {
            if (this.inComingWhiteListPKs !== undefined) {
                if (this.inComingWhiteListPKs.indexOf(message.signaturePair.signerPublicKey) === -1) {
                    return;
                }
            }
            subscription.cb(message);
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

    broadcast(message: LeanHelixMessage): void {
        const targetsIds = this.discovery.getAllGossipsPks();
        targetsIds.forEach(targetId => this.unicast(targetId, message));
    }

    multicast(targetsIds: string[], message: LeanHelixMessage): void {
        targetsIds.forEach(targetId => this.unicast(targetId, message));
    }

    unicast(pk: string, message: LeanHelixMessage): void {
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