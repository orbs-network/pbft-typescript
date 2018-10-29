import { Block } from "../../src";
import { Logger } from "../../src/logger/Logger";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { Gossip } from "../gossip/Gossip";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";

export class NodeBuilder {
    private gossip: Gossip;
    private blocksPool: Block[];
    private publicKey: string;
    private logger: Logger;
    private logsToConsole: boolean = false;

    constructor() {
    }

    public thatIsPartOf(gossip: Gossip): this {
        if (!this.gossip) {
            this.gossip = gossip;
        }
        return this;
    }

    public withPk(publicKey: string): this {
        if (!this.publicKey) {
            this.publicKey = publicKey;
        }
        return this;
    }

    public thatLogsTo(logger: Logger): this {
        if (!this.logger) {
            this.logger = logger;
        }
        return this;
    }

    public withBlocksPool(blocksPool: Block[]): this {
        if (!this.blocksPool) {
            this.blocksPool = blocksPool;
        }
        return this;
    }

    public get thatLogsToConsole(): this {
        this.logsToConsole = true;
        return this;
    }

    public build(): Node {
        const publicKey: string = this.publicKey ? this.publicKey : "Dummy PublicKey";
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(publicKey) : new SilentLogger();
        const blockUtils: BlockUtilsMock = new BlockUtilsMock(this.blocksPool);

        return new Node(this.publicKey, logger, this.gossip, blockUtils);
    }
}

export const aNode = () => new NodeBuilder();