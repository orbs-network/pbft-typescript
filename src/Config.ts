import { BlocksProvider } from "./blocksProvider/BlocksProvider";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { PBFTStorage } from "./storage/PBFTStorage";

export interface Config {
    electionTriggerFactory: ElectionTriggerFactory;
    networkCommunication: NetworkCommunication;
    blocksValidator: BlocksValidator;
    blocksProvider: BlocksProvider;
    pbftStorage?: PBFTStorage;
    keyManager: KeyManager;
    logger: Logger;
}