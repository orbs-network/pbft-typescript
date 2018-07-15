import { BlockStorage } from "./blockStorage/BlockStorage";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { Logger } from "./logger/Logger";
import { PBFTStorage } from "./storage/PBFTStorage";
import { KeyManager } from "./keyManager/KeyManager";
import { Network } from "./network/Network";
import { BlocksProvider } from "./blocksProvider/BlocksProvider";

export interface Config {
    network: Network;
    pbftStorage: PBFTStorage;
    logger: Logger;
    electionTriggerFactory: ElectionTriggerFactory;
    blocksProvider: BlocksProvider;
    blockStorage: BlockStorage;
    keyManager: KeyManager;
}