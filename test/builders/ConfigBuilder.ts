import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { Logger } from "../../src/logger/Logger";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { InMemoryBlockStorage } from "../blockStorage/InMemoryBlockStorage";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { SilentLogger } from "../logger/SilentLogger";
import { KeyManager } from "../../src/KeyManager/KeyManager";
import { NetworkCommunication } from "../../src";
import { InMemoryNetworkCommunicaiton } from "../networkCommunication/InMemoryNetworkCommunicaiton";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";

class ConfigBuilder {
    private publicKey: string;

    public withPk(publicKey: string): this {
        if (!this.publicKey) {
            this.publicKey = publicKey;
        }
        return this;
    }

    public build() {
        const electionTriggerFactory: ElectionTriggerFactory = () => new ElectionTriggerMock();
        const blocksValidator = new BlocksValidatorMock();
        const blocksProvider = new BlocksProviderMock();
        const logger: Logger = new SilentLogger();
        const pbftStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const discovery: GossipDiscovery = new GossipDiscovery();
        const gossip: Gossip = new Gossip(discovery, logger);
        const networkCommunication: NetworkCommunication = new InMemoryNetworkCommunicaiton(discovery, gossip);
        const blockStorage: BlockStorage = new InMemoryBlockStorage();
        const keyManager: KeyManager = undefined;

        return {
            networkCommunication,
            pbftStorage,
            logger,
            electionTriggerFactory,
            blocksValidator,
            blocksProvider,
            blockStorage,
            keyManager
        };
    }
}

export const aConfig = () => new ConfigBuilder();