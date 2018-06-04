import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { Node } from "../network/Node";
import { NodeMock } from "../network/NodeMock";
import { theGenesisBlock } from "./BlockBuilder";

export class NodeBuilder {
    private network: InMemoryNetwork;
    private name: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private gossip: Gossip;
    private electionTrigger: ElectionTrigger;
    private blocksValidator: BlocksValidator;
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
    public communicatesVia(gossip: Gossip): this {
        if (!this.gossip) {
            this.gossip = gossip;
        }
        return this;
    }

    public electingLeaderUsing(electionTrigger: ElectionTrigger): this {
        if (!this.electionTrigger) {
            this.electionTrigger = electionTrigger;
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
        const electionTrigger: ElectionTrigger = this.electionTrigger ? this.electionTrigger : new ElectionTriggerMock();
        const blocksValidator: BlocksValidator = this.blocksValidator ? this.blocksValidator : new BlocksValidatorMock();
        const blocksProvider: BlocksProvider = new BlocksProviderMock();
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
            electionTrigger,
            blocksProvider,
            blocksValidator
        };
    }
}

export const aNode = () => new NodeBuilder();