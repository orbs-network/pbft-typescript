import { Network } from "../../src/Network/Network";
import { Node } from "../../src/network/Node";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { ByzantineNode } from "../network/ByzantineNode";
import { LoyalNode } from "../network/LoyalNode";
import { aByzantineNode, aLoyalNode } from "./NodeBuilder";

class NetworkBuilder {
    private network: Network;
    private countOfLoyalNodes: number = 0;
    private countOfByzantineNodes: number = 0;
    private isLeaderLoyal: boolean = true;

    public and = this;
    public a = this;

    constructor() {
        this.network = new Network();
    }

    public with(count?: number) {
        const networkBuilder = this;
        class With {
            get loyalNodes() {
                networkBuilder.countOfLoyalNodes = count;
                return networkBuilder;
            }
            get byzantineNodes() {
                networkBuilder.countOfByzantineNodes = count;
                return networkBuilder;
            }
        }
        return new With();
    }

    public get leadBy() {
        const networkBuilder = this;
        class A {
            get loyalLeader() {
                networkBuilder.isLeaderLoyal = true;
                return networkBuilder;
            }
            get byzantineLeader() {
                networkBuilder.isLeaderLoyal = false;
                return networkBuilder;
            }
        }

        return {
            a: new A()
        };
    }
    public build(): Network {
        this.createNodes();
        return this.network;
    }

    private connectAllNodes(nodes: Node[]): void {
        nodes.map(nodeA => {
            nodes.map(nodeB => {
                if (nodeA !== nodeB) {
                    (nodeA.gossip as InMemoryGossip).registerRemoteMessagesListener(nodeB.publicKey, nodeB.gossip as InMemoryGossip);
                }
            });
        });
    }

    private createNodes(): void {
        const leaderPBFTStorage: PBFTStorage = new InMemoryPBFTStorage();
        const leader = this.isLeaderLoyal ? new LoyalNode(this.network, leaderPBFTStorage, "LoyalLeader") : new ByzantineNode(this.network, leaderPBFTStorage, "Byzantine-Leader");
        const nodes: Node[] = [leader];
        for (let i = 0; i < this.countOfLoyalNodes; i++) {
            const node = aLoyalNode().thatIsPartOf(this.network).named(`Loyal-Node${i + 1}`).build();
            nodes.push(node);
        }

        for (let i = 0; i < this.countOfByzantineNodes; i++) {
            const node = aByzantineNode().thatIsPartOf(this.network).named(`Byzantine-Node${i + 1}`).build();
            nodes.push(node);
        }

        this.network.registerNodes(nodes);
        this.network.initAllNodes();
        this.connectAllNodes(nodes);
    }
}

export const aNetwork = () => new NetworkBuilder();