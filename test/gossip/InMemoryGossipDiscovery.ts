import { InMemoryGossip } from "./InMemoryGossip";

export class InMemoryGossipDiscovery {
    private gossipMap: Map<string, InMemoryGossip> = new Map();

    getGossipById(id: string): InMemoryGossip {
        return this.gossipMap.get(id);
    }

    registerGossip(id: string, gossip: InMemoryGossip): void {
        this.gossipMap.set(id, gossip);
    }

    getGossips(ids?: string[]): InMemoryGossip[] {
        if (ids !== undefined) {
            return this.getAllGossipsIds().filter(id => ids.indexOf(id) > -1).map(id => this.getGossipById(id));
        } else {
            return Array.from(this.gossipMap.values());
        }
    }

    getAllGossipsIds(): string[] {
        return Array.from(this.gossipMap.keys());
    }
}