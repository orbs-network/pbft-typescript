import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { PBFTStorage } from "./storage/PBFTStorage";
import { BlockUtils } from "./blockUtils/BlockUtils";

export interface Config {
    networkCommunication: NetworkCommunication;
    blockUtils: BlockUtils;
    keyManager: KeyManager;
    logger: Logger;
    electionTriggerFactory: ElectionTriggerFactory;
    pbftStorage?: PBFTStorage;
}