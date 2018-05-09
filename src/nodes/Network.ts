import { Node } from "./Node";

export class Network {
    public nodes: Node[] = [];

    registerNode(node: Node): any {
        this.nodes.push(node);
    }

    getNodeIdxByPublicKey(publicKey: string): number {
        return this.nodes.findIndex(node => node.publicKey === publicKey);
    }
}