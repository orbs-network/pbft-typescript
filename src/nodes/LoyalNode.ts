import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Node } from "./Node";

export class LoyalNode implements Node {
    public gossip: Gossip;

    private latestBlock: string;
    private pbft: PBFT;

    constructor(totalNodes: number, public publicKey: string) {
        this.gossip = new InMemoryGossip();
        this.pbft = new PBFT(publicKey, totalNodes, this.gossip, block => this.onNewBlock(block));
    }

    public suggestBlock(block: string): void {
        this.pbft.suggestBlock(block);
    }

    public getLatestBlock(): string {
        return this.latestBlock;
    }
    private onNewBlock(block: string): void {
        this.latestBlock = block;
    }
}