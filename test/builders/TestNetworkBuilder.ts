import { Block } from "../../src/Block";
import { Logger } from "../../src/logger/Logger";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { TestNetwork } from "../network/TestNetwork";
import { aBlock, theGenesisBlock } from "./BlockBuilder";
import { aNode, NodeBuilder } from "./NodeBuilder";
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

class TestNetworkBuilder {
    private loggerCtor: LoggerConstructor = SilentLogger;
    private customNodes: NodeBuilder[] = [];
    private blocksPool: Block[];
    private testNetwork: TestNetwork;

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
        const discovery = new GossipDiscovery();
        this.testNetwork = new TestNetwork(discovery);
        this.createNodes(discovery);
        return this.testNetwork;
    }

    private buildNode(builder: NodeBuilder, publicKey: string, discovery: GossipDiscovery): Node {
        const logger: Logger = new this.loggerCtor(publicKey);
        const blockUtils: BlockUtilsMock = new BlockUtilsMock(this.blocksPool);
        const gossip = new Gossip(discovery);
        discovery.registerGossip(publicKey, gossip);
        return builder
            .thatIsPartOf(gossip)
            .gettingBlocksVia(blockUtils)
            .withPk(publicKey)
            .thatLogsTo(logger)
            .build();
    }

    private createNodes(discovery: GossipDiscovery): void {
        const nodes: Node[] = [];

        for (let i = 0; i < this.countOfNodes; i++) {
            const node = this.buildNode(aNode(), `Node ${i}`, discovery);
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => this.buildNode(nodeBuilder, `Custom-Node ${idx}`, discovery));
        nodes.push(...customNodes);
        this.testNetwork.registerNodes(nodes);
    }
}

export const aTestNetwork = () => new TestNetworkBuilder();
export const aSimpleTestNetwork = (countOfNodes: number = 4, blocksPool?: Block[]) => {
    if (!blocksPool) {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block2);
        const block4 = aBlock(block3);
        blocksPool = blocksPool || [block1, block2, block3, block4];
    }
    const testNetwork = aTestNetwork()
        .withBlocksPool(blocksPool)
        .with(countOfNodes).nodes
        .build();

    return {
        testNetwork,
        blocksPool
    };
};