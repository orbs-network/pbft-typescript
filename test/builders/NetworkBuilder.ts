import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { InMemoryGossipDiscovery } from "../gossip/InMemoryGossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { Node } from "../network/Node";
import { NodeBuilder, aByzantineNode, aLoyalNode } from "./NodeBuilder";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";

class NetworkBuilder {
    private network: InMemoryNetwork;
    private countOfLoyalNodes: number = 0;
    private countOfByzantineNodes: number = 0;
    private isLeaderLoyal: boolean = true;
    private logger: Logger;
    private customNodes: NodeBuilder[] = [];
    private customLeader: NodeBuilder;
    private logsToConsole: boolean = false;
    private electionTrigger: ElectionTrigger;

    public and = this;
    public a = this;

    public thatLogsTo(logger: Logger): this {
        this.logger = logger;
        return this;
    }

    public get thatLogsToConsole(): this {
        this.logsToConsole = true;
        return this;
    }

    public electingLeaderUsing(electionTrigger: ElectionTrigger): this {
        this.electionTrigger = electionTrigger;
        return this;
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

    public withCustomeNode(nodeBuilder: NodeBuilder): this {
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
            customLeader(customLeader: NodeBuilder) {
                networkBuilder.customLeader = customLeader;
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

    private buildNode(builder: NodeBuilder, id: string, discovery: InMemoryGossipDiscovery): Node {
        const gossip = new InMemoryGossip(discovery);
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(id) : new SilentLogger();
        const electionTrigger: ElectionTrigger = this.electionTrigger ? this.electionTrigger : new ElectionTriggerMock();
        discovery.registerGossip(id, gossip);
        return builder
            .thatIsPartOf(this.network)
            .communicatesVia(gossip)
            .electingLeaderUsing(electionTrigger)
            .named(id)
            .thatLogsTo(logger)
            .build();
    }

    private createNodes(): void {
        const discovery = new InMemoryGossipDiscovery();

        let leader: Node;
        if (this.customLeader) {
            leader = this.buildNode(this.customLeader, "Custome-Leader", discovery);
        } else {
            if (this.isLeaderLoyal) {
                leader = this.buildNode(aLoyalNode(), "Loyal-Leader", discovery);
            } else {
                leader = this.buildNode(aByzantineNode(), "Byzantine-Leader", discovery);
            }
        }

        const nodes: Node[] = [leader];
        for (let i = 0; i < this.countOfLoyalNodes; i++) {
            const node = this.buildNode(aLoyalNode(), `Loyal-Node${i + 1}`, discovery);
            nodes.push(node);
        }

        for (let i = 0; i < this.countOfByzantineNodes; i++) {
            const node = this.buildNode(aByzantineNode(), `Byzantine-Node${i + 1}`, discovery);
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => this.buildNode(nodeBuilder, `Custome-Node${idx + 1}`, discovery));
        nodes.push(...customNodes);
        this.network.registerNodes(nodes);
    }
}

export const aNetwork = () => new NetworkBuilder();