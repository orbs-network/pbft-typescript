import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {

    }

    getMembersPKs(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendToMembers(pks: string[], messageType: string, payload: any): void {
        this.gossip.multicast(pks, messageType, payload);
    }

    subscribeToMessages(cb: (messageType: string, payload: any) => void): number {
        return this.gossip.subscribe(cb);
    }

    unsubscribeFromMessages(subscription: number): void {
        return this.gossip.unsubscribe(subscription);
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }
}