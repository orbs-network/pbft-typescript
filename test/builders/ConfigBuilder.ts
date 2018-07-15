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
import { InMemoryPBFTStorage } from "../storage/InMemoryPBFTStorage";
import { KeyManager } from "../../src/KeyManager/KeyManager";
import { NetworkCommunication } from "../../src";
import { InMemoryNetworkCommunicaiton } from "../networkCommunication/InMemoryNetworkCommunicaiton";

class ConfigBuilder {
    private name: string;

    public named(name: string): this {
        if (!this.name) {
            this.name = name;
        }
        return this;
    }

    public build() {
        const electionTriggerFactory: ElectionTriggerFactory = view => new ElectionTriggerMock(view);
        const blocksValidator = new BlocksValidatorMock();
        const blocksProvider = new BlocksProviderMock();
        const id = this.name || "Node";
        const logger: Logger = new SilentLogger();
        const pbftStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const discovery: GossipDiscovery = new GossipDiscovery();
        const gossip: Gossip = new Gossip(discovery, logger);
        const networkCommunication: NetworkCommunication = new InMemoryNetworkCommunicaiton(discovery, gossip);
        const blockStorage: BlockStorage = new InMemoryBlockStorage();
        const keyManager: KeyManager = undefined;

        return {
            id,
            gossip,
            networkCommunication,
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

export const aConfig = () => new ConfigBuilder();