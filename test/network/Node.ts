import { Block } from "../../src/Block";
import { Gossip } from "../../src/gossip/Gossip";
import { PBFT } from "../../src/PBFT";

export interface Node {
    id: string;
    pbft: PBFT;
    isLeader(): boolean;
    suggestBlock(block: Block): Promise<void>;
    getLatestBlock(): Block;
    dispose(): void;
}
