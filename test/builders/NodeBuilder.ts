import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { BlockValidator } from "../../src/blockValidator/BlockValidator";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { TimerBasedElectionTrigger } from "../../src/electionTrigger/TimerBasedElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlockValidatorMock } from "../blockValidator/BlockValidatorMock";
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

    public and = this;

    constructor() {
    }

    public thatIsPartOf(network: InMemoryNetwork): this {
        this.network = network;
        return this;
    }

    public named(name: string): this {
        this.name = name;
        return this;
    }

    public storingOn(pbftStorage: PBFTStorage): this {
        this.pbftStorage = pbftStorage;
        return this;
    }

    public thatLogsTo(logger: Logger): this {
        this.logger = logger;
        return this;
    }

    public communicatesVia(gossip: Gossip): this {
        this.gossip = gossip;
        return this;
    }

    public electingLeaderUsing(electionTrigger: ElectionTrigger): this {
        this.electionTrigger = electionTrigger;
        return this;
    }

    public get thatLogsToConsole(): this {
        return this.thatLogsTo(new ConsoleLogger());
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
        const logger: Logger = this.logger ? this.logger : new SilentLogger();
        const electionTrigger: ElectionTrigger = this.electionTrigger ? this.electionTrigger : new TimerBasedElectionTrigger(30);
        const pbftStorage: PBFTStorage = this.pbftStorage ? this.pbftStorage : new InMemoryPBFTStorage(logger);
        const blockValidator: BlockValidator = new BlockValidatorMock();
        const id = this.name || (this.isByzantine ? "Byzantine-Node" : "Loyal-Node");

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