import { BlockUtils, NetworkCommunication } from "../../src";
import { Config } from "../../src/Config";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { Logger } from "../../src/logger/Logger";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { InMemoryBlockStorage } from "../blockStorage/InMemoryBlockStorage";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { InMemoryNetworkCommunicaiton } from "../networkCommunication/InMemoryNetworkCommunicaiton";

export class NodeBuilder {
    private networkCommunication: NetworkCommunication;
    private publicKey: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private electionTriggerFactory: ElectionTriggerFactory;
    private blocksValidator: BlocksValidatorMock;
    private blockUtils: BlockUtils;
    private logsToConsole: boolean = false;

    public and = this;

    constructor() {
    }

    public thatIsPartOf(networkCommunication: InMemoryNetworkCommunicaiton): this {
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

    public validateUsing(blocksValidator: BlocksValidatorMock): this {
        if (!this.blocksValidator) {
            this.blocksValidator = blocksValidator;
        }
        return this;
    }

    public gettingBlocksVia(blockUtils: BlockUtils): this {
        if (!this.blockUtils) {
            this.blockUtils = blockUtils;
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
        return new Node(this.publicKey, this.buildConfig(), new InMemoryBlockStorage());
    }

    private buildConfig(): Config {
        const electionTriggerFactory: ElectionTriggerFactory = this.electionTriggerFactory ? this.electionTriggerFactory : () => new ElectionTriggerMock();
        const blocksValidator: BlocksValidatorMock = this.blocksValidator ? this.blocksValidator : new BlocksValidatorMock();
        const blockUtils: BlockUtils = this.blockUtils ? this.blockUtils : new BlockUtilsMock(blocksValidator);
        const keyManager: KeyManager = new KeyManagerMock(this.publicKey);
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(keyManager.getMyPublicKey()) : new SilentLogger();
        const pbftStorage: PBFTStorage = this.pbftStorage ? this.pbftStorage : new InMemoryPBFTStorage(logger);

        return {
            networkCommunication: this.networkCommunication,
            logger,
            pbftStorage,
            electionTriggerFactory,
            blockUtils,
            keyManager
        };
    }
}

export const aNode = () => new NodeBuilder();