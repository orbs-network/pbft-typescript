import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTrigger } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { PBFTStorage } from "./storage/PBFTStorage";

export interface Config {
    networkCommunication: NetworkCommunication;
    blockUtils: BlockUtils;
    keyManager: KeyManager;
    logger: Logger;
    electionTrigger: ElectionTrigger;
    pbftStorage?: PBFTStorage;
}