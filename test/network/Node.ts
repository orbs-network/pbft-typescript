import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";

export interface Node {
    id: string;
    pbft: PBFT;
    isLeader(): boolean;
    getLatestBlock(): Promise<Block>;
    startConsensus(): void;
    dispose(): void;
}
