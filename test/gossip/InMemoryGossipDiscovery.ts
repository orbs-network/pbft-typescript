import { InMemoryGossip } from "./InMemoryGossip";

export class InMemoryGossipDiscovery {
    private gossipMap: Map<string, InMemoryGossip> = new Map();

    getGossipById(id: string): InMemoryGossip {
        return this.gossipMap.get(id);
    }

    registerGossip(id: string, gossip: InMemoryGossip): void {
        this.gossipMap.set(id, gossip);
    }

    getAllGossips(): InMemoryGossip[] {
        return Array.from(this.gossipMap.values());
    }
}