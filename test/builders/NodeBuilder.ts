import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { BlockValidator } from "../../src/blockValidator/BlockValidator";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlockValidatorMock } from "../blockValidator/BlockValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { ByzantineNode } from "../network/ByzantineNode";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { LoyalNode } from "../network/LoyalNode";
import { Node } from "../network/Node";
import { theGenesisBlock } from "./BlockBuilder";

export class NodeBuilder {
    private isByzantine: boolean = false;
    private network: InMemoryNetwork;
    private name: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private gossip: Gossip;
    private electionTrigger: ElectionTrigger;
    private blockValidator: BlockValidator;
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

    public validateUsing(blockValidator: BlockValidator): this {
        if (!this.blockValidator) {
            this.blockValidator = blockValidator;
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

    public get thatIsByzantine(): this {
        this.isByzantine = true;
        return this;
    }

    public build(): Node {
        const pbft = new PBFT(this.buildConfig());

        if (this.isByzantine) {
            return new ByzantineNode(pbft);
        } else {
            return new LoyalNode(pbft);
        }
    }

    private buildConfig(): Config {
        const electionTrigger: ElectionTrigger = this.electionTrigger ? this.electionTrigger : new ElectionTriggerMock();
        const blockValidator: BlockValidator = this.blockValidator ? this.blockValidator : new BlockValidatorMock();
        const id = this.name || (this.isByzantine ? "Byzantine-Node" : "Loyal-Node");
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
            blockValidator
        };
    }
}

export const aNode = () => new NodeBuilder();
export const aLoyalNode = aNode;
export const aByzantineNode = () => aNode().thatIsByzantine;