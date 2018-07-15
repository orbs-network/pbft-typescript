import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";
import { Config } from "../../src/Config";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { PBFT } from "../../src/PBFT";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { InMemoryBlockStorage } from "../blockStorage/InMemoryBlockStorage";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { ConsoleLogger } from "../logger/ConsoleLogger";
import { SilentLogger } from "../logger/SilentLogger";
import { Node } from "../network/Node";
import { InMemoryPBFTStorage } from "../storage/InMemoryPBFTStorage";
import { KeyManager } from "../../src/KeyManager/KeyManager";
import { InMemoryNetworkCommunicaiton } from "../networkCommunication/InMemoryNetworkCommunicaiton";
import { NetworkCommunication } from "../../src";

export class NodeBuilder {
    private networkCommunication: NetworkCommunication;
    private name: string;
    private pbftStorage: PBFTStorage;
    private logger: Logger;
    private electionTriggerFactory: ElectionTriggerFactory;
    private blocksValidator: BlocksValidator;
    private blocksProvider: BlocksProvider;
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
        return new Node("dummy pk", this.buildConfig());
    }

    private buildConfig(): Config {
        const electionTriggerFactory: ElectionTriggerFactory = this.electionTriggerFactory ? this.electionTriggerFactory : view => new ElectionTriggerMock(view);
        const blocksValidator: BlocksValidator = this.blocksValidator ? this.blocksValidator : new BlocksValidatorMock();
        const blocksProvider: BlocksProvider = this.blocksProvider ? this.blocksProvider : new BlocksProviderMock();
        const blockStorage: BlockStorage = new InMemoryBlockStorage();
        const keyManager: KeyManager = undefined; // TODO: implement
        const logger: Logger = this.logger ? this.logger : this.logsToConsole ? new ConsoleLogger(keyManager.getMyPublicKey()) : new SilentLogger();
        const pbftStorage: PBFTStorage = this.pbftStorage ? this.pbftStorage : new InMemoryPBFTStorage(logger);

        return {
            networkCommunication: this.networkCommunication,
            logger,
            pbftStorage,
            electionTriggerFactory,
            blocksProvider,
            blocksValidator,
            blockStorage,
            keyManager
        };
    }
}

export const aNode = () => new NodeBuilder();