import { Gossip } from "../gossip/Gossip";

export interface Node {
    id: string;
    publicKey: string;
    gossip: Gossip;
    appendBlock(block: string): void;
    getLatestBlock(): string;
}