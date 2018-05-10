import { Block } from "./Block";
import { Gossip } from "./gossip/Gossip";
import { Network } from "./network/Network";

export interface Config {
    genesisBlockHash: string;
    publicKey: string;
    network: Network;
    gossip: Gossip;
    onNewBlock: (block: Block) => void;
}