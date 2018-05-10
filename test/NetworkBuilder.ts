import { Network } from "../src/Network/Network";
import { Node } from "../src/network/Node";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { ByzantineNode } from "./network/ByzantineNode";
import { LoyalNode } from "./network/LoyalNode";

class NetworkBuilder {
    private network: Network;
    private countOfLoyalNodes: number = 0;
    private countOfByzantineNodes: number = 0;
    private isLeaderLoyal: boolean = true;

    public and = this;

    constructor() {
        this.network = new Network();
    }

    public with(count?: number) {
        return {
            loyalLeader: () => {
                this.isLeaderLoyal = true;
                return this;
            },
            byzantineLeader: () => {
                this.isLeaderLoyal = false;
                return this;
            },
            loyalNodes: () => {
                this.countOfLoyalNodes = count;
                return this;
            },
            byzantineNodes: () => {
                this.countOfByzantineNodes = count;
                return this;
            }
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
        const leader = this.isLeaderLoyal ? new LoyalNode(this.network, "LoyalLeader") : new ByzantineNode(this.network, "Byzantine-Leader");
        const nodes: Node[] = [leader];
        for (let i = 0; i < this.countOfLoyalNodes; i++) {
            const node = new LoyalNode(this.network, `Loyal-Node${i + 1}`);
            nodes.push(node);
        }

        for (let i = 0; i < this.countOfByzantineNodes; i++) {
            const node = new ByzantineNode(this.network, `Byzantine-Node${i + 1}`);
            nodes.push(node);
        }

        this.network.registerNodes(nodes);
        this.network.initAllNodes();
        this.connectAllNodes(nodes);
    }
}

export const aNetwork = () => new NetworkBuilder();