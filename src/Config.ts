import { BlockUtils } from "./blockUtils/BlockUtils";
import { ElectionTrigger } from "./electionTrigger/ElectionTrigger";
import { KeyManager } from "./keyManager/KeyManager";
import { Logger } from "./logger/Logger";
import { NetworkCommunication } from "./networkCommunication/NetworkCommunication";
import { PBFTStorage } from "./storage/PBFTStorage";
import { MessagesFactory } from "./networkCommunication/MessagesFactory";

export interface Config {
    networkCommunication: NetworkCommunication;
    messagesFactory: MessagesFactory;
    blockUtils: BlockUtils;
    keyManager: KeyManager;
    logger: Logger;
    electionTrigger: ElectionTrigger;
    pbftStorage?: PBFTStorage;
}