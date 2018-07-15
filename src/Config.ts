import { BlocksProvider } from "./blocksProvider/BlocksProvider";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { Logger } from "./logger/Logger";
import { PBFTStorage } from "./storage/PBFTStorage";
import { KeyManager } from "./keyManager/KeyManager";

export interface Config {
    networkCommunication: NetworkCommunication;
    pbftStorage: PBFTStorage;
    logger: Logger;
    electionTriggerFactory: ElectionTriggerFactory;
    blocksValidator: BlocksValidator;
    blocksProvider: BlocksProvider;
    blockStorage: BlockStorage;
    keyManager: KeyManager;
}