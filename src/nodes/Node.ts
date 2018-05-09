import { Gossip } from "../gossip/Gossip";
import { Block } from "../Block";

export interface Node {
    publicKey: string;
    gossip: Gossip;
    init(): void;
    suggestBlock(block: Block): void;
    getLatestBlock(): Block;
}