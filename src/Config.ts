import { ElectionTriggerFactory } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { PBFTStorage } from "./storage/PBFTStorage";
import { BlockUtils } from "./blockUtils/BlockUtils";

export interface Config {
    electionTriggerFactory: ElectionTriggerFactory;
    networkCommunication: NetworkCommunication;
    blockUtils: BlockUtils;
    pbftStorage?: PBFTStorage;
    keyManager: KeyManager;
    logger: Logger;
}