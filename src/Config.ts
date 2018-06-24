import { BlocksProvider } from "./blocksProvider/BlocksProvider";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { Gossip } from "./gossip/Gossip";
import { Logger } from "./logger/Logger";
import { Network } from "./network/Network";
import { PBFTStorage } from "./storage/PBFTStorage";

export interface Config {
    id: string;
    network: Network;
    genesisBlockHash: string;
    gossip: Gossip;
    pbftStorage: PBFTStorage;
    logger: Logger;
    electionTriggerFactory: ElectionTriggerFactory;
    blocksValidator: BlocksValidator;
    blocksProvider: BlocksProvider;
}