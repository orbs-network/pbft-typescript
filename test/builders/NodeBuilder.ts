import { BlockUtils, NetworkCommunication } from "../../src";
import { Config } from "../../src/Config";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { Gossip } from "../gossip/Gossip";

export class NodeBuilder {
    private gossip: Gossip;
    private publicKey: string;
    private logger: Logger;
    private blockUtils: BlockUtilsMock;
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

    public gettingBlocksVia(blockUtils: BlockUtilsMock): this {
        if (!this.blockUtils) {
            this.blockUtils = blockUtils;
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
        const blockUtils: BlockUtilsMock = this.blockUtils ? this.blockUtils : new BlockUtilsMock();

        return new Node(this.publicKey, logger, this.gossip, blockUtils);
    }
}

export const aNode = () => new NodeBuilder();