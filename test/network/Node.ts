import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";

export interface Node {
    id: string;
    pbft: PBFT;
    isLeader(): boolean;
    getLatestBlock(): Block;
    processNextBlock(): void;
    dispose(): void;
}
