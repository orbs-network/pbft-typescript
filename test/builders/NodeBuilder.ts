import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";
import { Config } from "../../src/Config";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { PBFT } from "../../src/PBFT";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { Node } from "../network/Node";
import { NodeMock } from "../network/NodeMock";
import { InMemoryPBFTStorage } from "../storage/InMemoryPBFTStorage";
import { theGenesisBlock } from "./BlockBuilder";

export class NodeBuilder {
    private network: InMemoryNetwork;
    private name: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private gossip: Gossip;
    private electionTriggerFactory: ElectionTriggerFactory;
    private blocksValidator: BlocksValidator;
    private blocksProvider: BlocksProvider;
    private logsToConsole: boolean = false;

    public and = this;

    constructor() {
    }

    public thatIsPartOf(network: InMemoryNetwork): this {
        if (!this.network) {
            this.network = network;
        }
        return this;
    }

    public named(name: string): this {
        if (!this.name) {
            this.name = name;
        }
        return this;
    }

    public storingOn(pbftStorage: PBFTStorage): this {
        if (!this.pbftStorage) {
            this.pbftStorage = pbftStorage;
        }
        return this;
    }

    public thatLogsTo(logger: Logger): this {
        if (!this.logger) {
            this.logger = logger;
        }
        return this;
    }

    public validateUsing(blocksValidator: BlocksValidator): this {
        if (!this.blocksValidator) {
            this.blocksValidator = blocksValidator;
        }
        return this;
    }

    public gettingBlocksVia(blocksProvider: BlocksProvider): this {
        if (!this.blocksProvider) {
            this.blocksProvider = blocksProvider;
        }
        return this;
    }

    public communicatesVia(gossip: Gossip): this {
        if (!this.gossip) {
            this.gossip = gossip;
        }
        return this;
    }

    public electingLeaderUsing(electionTriggerFactory: ElectionTriggerFactory): this {
        if (!this.electionTriggerFactory) {
            this.electionTriggerFactory = electionTriggerFactory;
        }
        return this;
    }

    public get thatLogsToConsole(): this {
        this.logsToConsole = true;
        return this;
    }

    public build(): Node {
        const pbft = new PBFT(this.buildConfig());
        return new NodeMock(pbft);
    }

    private buildConfig(): Config {
        const electionTriggerFactory: ElectionTriggerFactory = this.electionTriggerFactory ? this.electionTriggerFactory : view => new ElectionTriggerMock(view);
        const blocksValidator: BlocksValidator = this.blocksValidator ? this.blocksValidator : new BlocksValidatorMock();
        const blocksProvider: BlocksProvider = this.blocksProvider ? this.blocksProvider : new BlocksProviderMock();
        const id = this.name || "Node";
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(id) : new SilentLogger();
        const pbftStorage: PBFTStorage = this.pbftStorage ? this.pbftStorage : new InMemoryPBFTStorage(logger);

        return {
            id,
            genesisBlockHash: theGenesisBlock.hash,
            network: this.network,
            gossip: this.gossip,
            logger,
            pbftStorage,
            electionTriggerFactory,
            blocksProvider,
            blocksValidator
        };
    }
}

export const aNode = () => new NodeBuilder();