import { Block } from "../../src/Block";
import { Gossip } from "../../src/gossip/Gossip";

export interface Node {
    id: string;
    gossip: Gossip;
    isLeader(): boolean;
    init(): void;
    suggestBlock(block: Block): void;
    getLatestBlock(): Block;
    dispose(): void;
}
