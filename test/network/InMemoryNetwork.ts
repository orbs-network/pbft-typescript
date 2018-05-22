import { Network } from "../../src/network/Network";
import { Node } from "./Node";

export class InMemoryNetwork implements Network {
    public nodes: Node[] = [];

    registerNode(node: Node): void {
        this.nodes.push(node);
    }

    registerNodes(nodes: Node[]): void {
        nodes.forEach(node => this.registerNode(node));
    }

    getNodeIndexById(nodeId: string): number {
        return this.nodes.findIndex(node => node.id === nodeId);
    }

    getNodeIdBySeed(seed: number): string {
        const index = seed % this.getNodesCount();
        return this.nodes[index].id;
    }

    getNodeByIdx(index: number): Node {
        return this.nodes[index];
    }

    initAllNodes(): void {
        this.nodes.forEach(node => node.init());
    }

    getNodesCount(): number {
        return this.nodes.length;
    }

    shutDown(): void {
        this.nodes.forEach(node => node.dispose());
    }
}