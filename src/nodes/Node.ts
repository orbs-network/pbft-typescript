import { Gossip } from "../gossip/Gossip";

export interface Node {
    publicKey: string;
    gossip: Gossip;
    suggestBlock(block: string): void;
    getLatestBlock(): string;
}