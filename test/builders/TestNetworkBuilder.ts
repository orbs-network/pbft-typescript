import { BlockUtils, NetworkCommunication } from "../../src";
import { Block } from "../../src/Block";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { SocketsLogger } from "../../src/logger/SocketsLogger";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { TestNetwork } from "../network/TestNetwork";
import { aBlock, theGenesisBlock } from "./BlockBuilder";
import { aNode, NodeBuilder } from "./NodeBuilder";
export interface LoggerConstructor {
    new (id: string): Logger;
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
    private blockUtils: BlockUtilsMock;
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

    public blocksInPool(blocks: Block[]): this {
        this.blocksPool = blocks;
        return this;
    }

    public withCustomNode(nodeBuilder: NodeBuilder): this {
        this.customNodes.push(nodeBuilder);
        return this;
    }

    public gettingBlocksVia(blockUtils: BlockUtilsMock): this {
        if (!this.blockUtils) {
            this.blockUtils = blockUtils;
        }
        return this;
    }

    public build(): TestNetwork {
        const discovery = new GossipDiscovery();
        this.testNetwork = new TestNetwork(discovery);
        this.createNodes(discovery);
        return this.testNetwork;
    }

    private buildNode(builder: NodeBuilder, pk: string, discovery: GossipDiscovery): Node {
        const logger: Logger = new this.loggerCtor(pk);
        const blockUtils: BlockUtilsMock = this.blockUtils ? this.blockUtils : new BlockUtilsMock();
        const gossip = new Gossip(discovery);
        discovery.registerGossip(pk, gossip);
        return builder
            .thatIsPartOf(gossip)
            .gettingBlocksVia(blockUtils)
            .withPk(pk)
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
    const block1 = aBlock(theGenesisBlock);
    const block2 = aBlock(block1);
    const block3 = aBlock(block2);
    const block4 = aBlock(block3);
    blocksPool = blocksPool || [block1, block2, block3, block4];
    const blockUtils = new BlockUtilsMock(blocksPool);
    const testNetwork = aTestNetwork()
        .gettingBlocksVia(blockUtils)
        .thatLogsToCustomeLogger(SocketsLogger)
        .with(countOfNodes).nodes
        .build();

    return {
        testNetwork,
        blockUtils,
        blocksPool
    };
};