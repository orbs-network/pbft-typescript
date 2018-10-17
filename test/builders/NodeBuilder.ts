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

export class NodeBuilder {
    private networkCommunication: NetworkCommunication;
    private publicKey: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private electionTrigger: ElectionTrigger;
    private blockUtils: BlockUtils;
    private logsToConsole: boolean = false;

    constructor() {
    }

    public thatIsPartOf(networkCommunication: NetworkCommunication): this {
        if (!this.networkCommunication) {
            this.networkCommunication = networkCommunication;
        }
        return this;
    }

    public withPk(publicKey: string): this {
        if (!this.publicKey) {
            this.publicKey = publicKey;
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

    public gettingBlocksVia(blockUtils: BlockUtils): this {
        if (!this.blockUtils) {
            this.blockUtils = blockUtils;
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
        return new Node(this.publicKey, this.buildConfig());
    }

    private buildConfig(): Config {
        const electionTrigger: ElectionTrigger = this.electionTrigger ? this.electionTrigger : new ElectionTriggerMock();
        const blockUtils: BlockUtils = this.blockUtils ? this.blockUtils : new BlockUtilsMock();
        const keyManager: KeyManager = new KeyManagerMock(this.publicKey);
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(keyManager.getMyPublicKey()) : new SilentLogger();
        const pbftStorage: PBFTStorage = this.pbftStorage ? this.pbftStorage : new InMemoryPBFTStorage(logger);

        return {
            networkCommunication: this.networkCommunication,
            logger,
            pbftStorage,
            electionTrigger,
            blockUtils,
            keyManager
        };
    }
}

export const aNode = () => new NodeBuilder();