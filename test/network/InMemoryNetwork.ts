import { Network } from "../../src/network/Network";
import { Node } from "./Node";

export class InMemoryNetwork implements Network {
    public nodes: Node[] = [];

    getNodeIdBySeed(seed: number): string {
        const index = seed % this.getNodesCount();
        return this.nodes[index].id;
    }

    getNodesCount(): number {
        return this.nodes.length;
    }

    getAllNodesIds(): string[] {
        return this.nodes.map(node => node.id);
    }

    registerNode(node: Node): void {
        this.nodes.push(node);
    }

    registerNodes(nodes: Node[]): void {
        nodes.forEach(node => this.registerNode(node));
    }

    shutDown(): void {
        this.nodes.forEach(node => node.dispose());
    }
}