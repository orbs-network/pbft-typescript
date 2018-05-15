import { Node } from "./Node";

export class Network {
    public nodes: Node[] = [];

    registerNode(node: Node): void {
        this.nodes.push(node);
    }

    registerNodes(nodes: Node[]): void {
        nodes.forEach(node => this.registerNode(node));
    }

    getNodeIdxByPublicKey(publicKey: string): number {
        return this.nodes.findIndex(node => node.publicKey === publicKey);
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