import { Gossip } from "./Gossip";

export class GossipDiscovery {
    private gossipMap: Map<string, Gossip> = new Map();

    getGossipByPk(pk: string): Gossip {
        return this.gossipMap.get(pk);
    }

    registerGossip(pk: string, gossip: Gossip): void {
        this.gossipMap.set(pk, gossip);
    }

    getGossips(pks?: string[]): Gossip[] {
        if (pks !== undefined) {
            return this.getAllGossipsPks().filter(pk => pks.indexOf(pk) > -1).map(pk => this.getGossipByPk(pk));
        } else {
            return Array.from(this.gossipMap.values());
        }
    }

    getAllGossipsPks(): string[] {
        return Array.from(this.gossipMap.keys());
    }
}