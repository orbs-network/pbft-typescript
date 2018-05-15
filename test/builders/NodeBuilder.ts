import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { ByzantineNode } from "../network/ByzantineNode";
import { LoyalNode } from "../network/LoyalNode";

class NodeBuilder {
    private isByzantine: boolean = false;
    private network: Network;
    private name: string;
    private pbftStorage: PBFTStorage;

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

    public storingOn(pbftStorage: PBFTStorage): void {
        this.pbftStorage = pbftStorage;
    }

    public get thatIsByzantine(): this {
        this.isByzantine = true;
        return this;
    }

    public build(): Node {
        const pbftStorage: PBFTStorage = this.pbftStorage !== undefined ? this.pbftStorage : new InMemoryPBFTStorage();
        if (this.isByzantine) {
            return new ByzantineNode(this.network, pbftStorage, this.name || "Byzantine-Node");
        } else {
            return new LoyalNode(this.network, pbftStorage, this.name || "Loyal-Node");
        }
    }
}

export const aNode = () => new NodeBuilder();
export const aLoyalNode = aNode;
export const aByzantineNode = () => aNode().thatIsByzantine;