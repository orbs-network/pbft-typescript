import { Network } from "../../src/network/Network";

export class NetworkMock implements Network {
    public nodes: string[] = ["Node0", "Node1", "Node2", "Node3"];

    getNodeIdBySeed(seed: number): string {
        const index = seed % this.getNodesCount();
        return this.nodes[index];
    }

    getNodesCount(): number {
        return this.nodes.length;
    }

    getAllNodesIds(): string[] {
        return this.nodes;
    }

    isMember(nodeId: string): boolean {
        return this.nodes.indexOf(nodeId) > -1;
    }
}