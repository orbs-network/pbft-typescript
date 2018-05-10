import { Block } from "../../src/Block";
import { Gossip } from "../../src/gossip/Gossip";

export interface Node {
    publicKey: string;
    gossip: Gossip;
    init(): void;
    suggestBlock(block: Block): void;
    getLatestBlock(): Block;
}