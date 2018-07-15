import { Node } from "./Node";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { Gossip } from "../gossip/Gossip";

export class TestNetwork {
    public nodes: Node[] = [];

    constructor(public gossipDiscovery: GossipDiscovery) {

    }

    getNodeGossip(nodePublicKey: string): Gossip {
        return this.gossipDiscovery.getGossipByPk(nodePublicKey);
    }

    registerNode(node: Node): void {
        this.nodes.push(node);
    }

    registerNodes(nodes: Node[]): void {
        nodes.forEach(node => this.registerNode(node));
    }

    startConsensusOnAllNodes(): void {
        for (const node of this.nodes) {
            node.startConsensus();
        }
    }

    shutDown(): void {
        this.nodes.forEach(node => node.dispose());
    }
}