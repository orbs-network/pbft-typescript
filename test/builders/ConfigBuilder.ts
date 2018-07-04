import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";
import { Config } from "../../src/Config";
import { ElectionTriggerFactory } from "../../src/electionTrigger/ElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { Network } from "../../src/network/Network";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { InMemoryGossipDiscovery } from "../gossip/InMemoryGossipDiscovery";
import { SilentLogger } from "../logger/SilentLogger";
import { NetworkMock } from "../network/NetworkMock";
import { InMemoryPBFTStorage } from "../storage/InMemoryPBFTStorage";

class ConfigBuilder {

    public build(): Config {
        const electionTriggerFactory: ElectionTriggerFactory = view => new ElectionTriggerMock(view);
        const blocksValidator: BlocksValidator = new BlocksValidatorMock();
        const blocksProvider: BlocksProvider = new BlocksProviderMock();
        const id = "Dummy Node";
        const logger: Logger = new SilentLogger();
        const pbftStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const discovery: InMemoryGossipDiscovery = new InMemoryGossipDiscovery();
        const gossip: Gossip = new InMemoryGossip(discovery, logger);
        const network: Network = new NetworkMock();

        return {
            id,
            network,
            gossip,
            logger,
            pbftStorage,
            electionTriggerFactory,
            blocksProvider,
            blocksValidator
        };
    }
}

export const aConfig = () => new ConfigBuilder().build();