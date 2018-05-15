import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { Network } from "./network/Network";
import { PBFTStorage } from "./storage/PBFTStorage";

export interface Config {
    genesisBlockHash: string;
    publicKey: string;
    network: Network;
    gossip: Gossip;
    pbftStorage: PBFTStorage;
    onNewBlock: (block: Block) => void;
    validateBlock?: (block: Block) => Promise<boolean>;
}