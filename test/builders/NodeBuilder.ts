import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { ByzantineNode } from "../network/ByzantineNode";
import { LoyalNode } from "../network/LoyalNode";

class NodeBuilder {
    private isByzantine: boolean = false;
    private network: Network;
    private name: string;

    public and = this;

    constructor() {
    }

    public thatIsPartOf(network: Network): this {
        this.network = network;
        return this;
    }

    public named(name: string): this {
        this.name = name;
        return this;
    }

    public get thatIsByzantine(): this {
        this.isByzantine = true;
        return this;
    }

    public build(): Node {
        if (this.isByzantine) {
            return new ByzantineNode(this.network, this.name || "Byzantine-Node");
        } else {
            return new LoyalNode(this.network, this.name || "Loyal-Node");
        }
    }
}

export const aNode = () => new NodeBuilder();
export const aLoyalNode = aNode;
export const aByzantineNode = () => aNode().thatIsByzantine;