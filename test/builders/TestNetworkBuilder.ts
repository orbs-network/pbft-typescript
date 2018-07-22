import { Block } from "../../src/Block";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { TestNetwork } from "../network/TestNetwork";
import { InMemoryNetworkCommunicaiton } from "../networkCommunication/InMemoryNetworkCommunicaiton";
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
    private electionTriggerFactory: ElectionTriggerFactory;
    private blocksValidator: BlocksValidatorMock;
    private blocksProvider: BlocksProviderMock;
    private blocksPool: Block[];
    private testNetwork: TestNetwork;

    public countOfNodes: number = 0;
    public and = this;
    public a = this;

    public get thatLogsToConsole(): this {
        this.thatLogsToCustomeLogger(ConsoleLogger);
        return this;
    }

    public thatLogsToCustomeLogger(ctor: LoggerConstructor): this {
        this.loggerCtor = ctor;
        return this;
    }

    public electingLeaderUsing(electionTriggerFactory: ElectionTriggerFactory): this {
        this.electionTriggerFactory = electionTriggerFactory;
        return this;
    }

    public validateUsing(blocksValidator: BlocksValidatorMock): this {
        this.blocksValidator = blocksValidator;
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

    public gettingBlocksVia(blocksProvider: BlocksProviderMock): this {
        if (!this.blocksProvider) {
            this.blocksProvider = blocksProvider;
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
        const electionTriggerFactory: ElectionTriggerFactory = this.electionTriggerFactory ? this.electionTriggerFactory : () => new ElectionTriggerMock();
        const blocksValidator: BlocksValidatorMock = this.blocksValidator ? this.blocksValidator : new BlocksValidatorMock();
        const blocksProvider: BlocksProviderMock = this.blocksProvider ? this.blocksProvider : new BlocksProviderMock();
        const gossip = new Gossip(discovery, logger);
        discovery.registerGossip(pk, gossip);
        const networkCommunication: InMemoryNetworkCommunicaiton = new InMemoryNetworkCommunicaiton(discovery, gossip);
        return builder
            .thatIsPartOf(networkCommunication)
            .gettingBlocksVia(blocksProvider)
            .electingLeaderUsing(electionTriggerFactory)
            .validateUsing(blocksValidator)
            .withPk(pk)
            .thatLogsTo(logger)
            .build();
    }

    private createNodes(discovery: GossipDiscovery): void {
        const nodes: Node[] = [];

        for (let i = 0; i < this.countOfNodes; i++) {
            const node = this.buildNode(aNode(), `Node ${i} pk`, discovery);
            nodes.push(node);
        }

        const customNodes = this.customNodes.map((nodeBuilder, idx) => this.buildNode(nodeBuilder, `Custom-Node ${idx} pk`, discovery));
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
    const electionTriggers: ElectionTriggerMock[] = [];
    const electionTriggerFactory = () => {
        const t = new ElectionTriggerMock();
        electionTriggers.push(t);
        return t;
    };
    const triggerElection = () => electionTriggers.map(e => e.trigger());
    const blocksValidator = new BlocksValidatorMock();
    const blocksProvider = new BlocksProviderMock(blocksPool);
    const testNetwork = aTestNetwork()
        .validateUsing(blocksValidator)
        .electingLeaderUsing(electionTriggerFactory)
        .gettingBlocksVia(blocksProvider)
        .with(countOfNodes).nodes
        .build();

    return {
        testNetwork,
        blocksValidator,
        blocksProvider,
        blocksPool,
        triggerElection
    };
};