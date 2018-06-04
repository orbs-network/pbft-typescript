import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { InMemoryGossipDiscovery } from "../gossip/InMemoryGossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { Node } from "../network/Node";
import { NodeBuilder, aNode } from "./NodeBuilder";

class NetworkBuilder {
    private network: InMemoryNetwork;
    private countOfNodes: number = 0;
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
            get nodes() {
                networkBuilder.countOfNodes = count;
                return networkBuilder;
            }
        }
        return new With();
    }

    public withCustomeNode(nodeBuilder: NodeBuilder): this {
        this.customNodes.push(nodeBuilder);
        return this;
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

        const nodes: Node[] = [];
        let leader: Node;
        if (this.customLeader) {
            leader = this.buildNode(this.customLeader, "Custome-Leader", discovery);
            nodes.push(leader);
        }

        for (let i = 0; i < this.countOfNodes; i++) {
            const node = this.buildNode(aNode(), `Node${i + 1}`, discovery);
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => this.buildNode(nodeBuilder, `Custome-Node${idx + 1}`, discovery));
        nodes.push(...customNodes);
        this.network.registerNodes(nodes);
    }
}

export const aNetwork = () => new NetworkBuilder();