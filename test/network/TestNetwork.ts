import { Node } from "./Node";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { Gossip } from "../gossip/Gossip";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { Block } from "../../src";

export class TestNetwork {
    public nodes: Node[] = [];

    constructor(public gossipDiscovery: GossipDiscovery, public blocksPool: Block[]) {

    }

    async provideNextBlock(): Promise<any> {
        return Promise.all(this.nodes.map(n => n.blockUtils.provideNextBlock()));
    }

    async resolveAllValidations(isValid: boolean, excludedNodes: Node[] = []): Promise<any> {
        const relevantNodes: Node[] = this.nodes.filter(n => excludedNodes.indexOf(n) === -1);
        const blockUtilsList: BlockUtilsMock[] = relevantNodes.map(n => n.blockUtils);
        const promises = blockUtilsList.map(bu => bu.resolveAllValidations(isValid));
        return Promise.all(promises);
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