import { Block } from "../../src/Block";
import { Logger } from "../../src/logger/Logger";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { TestNetwork } from "../network/TestNetwork";
import { aBlock, theGenesisBlock } from "./BlockBuilder";
import { NodeBuilder } from "./NodeBuilder";
export interface LoggerConstructor {
    new(id: string): Logger;
}
export class With {
    constructor(private testNetworkBuilder: TestNetworkBuilder, private count: number) {

    }
    get nodes() {
        this.testNetworkBuilder.countOfNodes = this.count;
        return this.testNetworkBuilder;
    }
}

export class TestNetworkBuilder {
    private loggerCtor: LoggerConstructor = SilentLogger;
    private customNodes: NodeBuilder[] = [];
    private blocksPool: Block[];

    public countOfNodes: number = 0;

    public get thatLogsToConsole(): this {
        this.thatLogsToCustomeLogger(ConsoleLogger);
        return this;
    }

    public thatLogsToCustomeLogger(ctor: LoggerConstructor): this {
        this.loggerCtor = ctor;
        return this;
    }

    public with(count?: number) {
        return new With(this, count);
    }

    public withCustomNode(nodeBuilder: NodeBuilder): this {
        this.customNodes.push(nodeBuilder);
        return this;
    }

    public withBlocksPool(blocksPool: Block[]): this {
        if (!this.blocksPool) {
            this.blocksPool = blocksPool;
        }
        return this;
    }

    public build(): TestNetwork {
        const blocksPool: Block[] = this.buildBlocksPool();
        const discovery = new GossipDiscovery();
        const nodes = this.createNodes(discovery, blocksPool);
        const testNetwork = new TestNetwork(discovery, blocksPool);
        testNetwork.registerNodes(nodes);
        return testNetwork;
    }

    private buildBlocksPool(): Block[] {
        let blocksPool = this.blocksPool;
        if (!blocksPool) {
            const block1 = aBlock(theGenesisBlock);
            const block2 = aBlock(block1);
            const block3 = aBlock(block2);
            const block4 = aBlock(block3);
            blocksPool = [block1, block2, block3, block4];
        }
        return blocksPool;
    }

    private buildNode(builder: NodeBuilder, publicKey: string, discovery: GossipDiscovery, blocksPool: Block[]): Node {
        const logger: Logger = new this.loggerCtor(publicKey);
        const gossip = new Gossip(discovery);
        discovery.registerGossip(publicKey, gossip);
        return builder
            .thatIsPartOf(gossip)
            .withBlocksPool(blocksPool)
            .withPk(publicKey)
            .thatLogsTo(logger)
            .build();
    }

    private createNodes(discovery: GossipDiscovery, blocksPool: Block[]): Node[] {
        const nodes: Node[] = [];

        for (let i = 0; i < this.countOfNodes; i++) {
            const nodeBuilder = new NodeBuilder();
            const node = this.buildNode(nodeBuilder, `Node ${i}`, discovery, blocksPool);
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => this.buildNode(nodeBuilder, `Custom-Node ${idx}`, discovery, blocksPool));
        nodes.push(...customNodes);
        return nodes;
    }
}

export const aTestNetwork = (countOfNodes: number = 4, blocksPool?: Block[]) => {
    return new TestNetworkBuilder()
        .withBlocksPool(blocksPool)
        .with(countOfNodes).nodes
        .build();
};