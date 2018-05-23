import { Logger } from "../../src/logger/Logger";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { InMemoryGossipDiscovery } from "../gossip/InMemoryGossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { Node } from "../network/Node";
import { NodeBuilder, aByzantineNode, aLoyalNode } from "./NodeBuilder";

class NetworkBuilder {
    private network: InMemoryNetwork;
    private countOfLoyalNodes: number = 0;
    private countOfByzantineNodes: number = 0;
    private isLeaderLoyal: boolean = true;
    private logger: Logger;
    private customNodes: NodeBuilder[] = [];

    public and = this;
    public a = this;

    public thatLogsTo(logger: Logger): this {
        this.logger = logger;
        return this;
    }

    public get thatLogsToConsole(): this {
        return this.thatLogsTo(new ConsoleLogger());
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

    public withNode(nodeBuilder: NodeBuilder): this {
        this.customNodes.push(nodeBuilder);
        return this;
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
    public build(): InMemoryNetwork {
        this.network = new InMemoryNetwork();
        this.createNodes();
        return this.network;
    }

    private createNodes(): void {
        const discovery = new InMemoryGossipDiscovery();
        const logger: Logger = this.logger ? this.logger : new SilentLogger();

        let leader: Node;
        if (this.isLeaderLoyal) {
            const gossip = new InMemoryGossip(discovery);
            const id = "Loyal-Leader";
            discovery.registerGossip(id, gossip);
            leader = aLoyalNode()
                .thatIsPartOf(this.network)
                .communicatesVia(gossip)
                .named("Loyal-Leader")
                .thatLogsTo(logger)
                .build();
        } else {
            const gossip = new InMemoryGossip(discovery);
            const id = "Byzantine-Leader";
            discovery.registerGossip(id, gossip);
            leader = aByzantineNode()
                .thatIsPartOf(this.network)
                .communicatesVia(gossip)
                .named(id)
                .thatLogsTo(logger)
                .build();
        }

        const nodes: Node[] = [leader];
        for (let i = 0; i < this.countOfLoyalNodes; i++) {
            const gossip = new InMemoryGossip(discovery);
            const id = `Loyal-Node${i + 1}`;
            discovery.registerGossip(id, gossip);
            const node = aLoyalNode()
                .thatIsPartOf(this.network)
                .communicatesVia(gossip)
                .named(id)
                .thatLogsTo(logger)
                .build();
            nodes.push(node);
        }

        for (let i = 0; i < this.countOfByzantineNodes; i++) {
            const gossip = new InMemoryGossip(discovery);
            const id = `Byzantine-Node${i + 1}`;
            discovery.registerGossip(id, gossip);
            const node = aByzantineNode()
                .thatIsPartOf(this.network)
                .communicatesVia(gossip)
                .named(id)
                .thatLogsTo(logger)
                .build();
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => {
            const gossip = new InMemoryGossip(discovery);
            const id = `Custome-Node${idx + 1}`;
            discovery.registerGossip(id, gossip);
            return nodeBuilder
                .named(id)
                .thatIsPartOf(this.network)
                .communicatesVia(gossip)
                .build();
        });
        nodes.push(...customNodes);
        this.network.registerNodes(nodes);
    }
}

export const aNetwork = () => new NetworkBuilder();