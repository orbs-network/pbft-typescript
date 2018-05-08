import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Node } from "./Node";

export class ByzantineNode implements Node {
    public gossip: Gossip;

    private latestBlock: string;
    private pbft: PBFT;

    constructor(totalNodes: number, public publicKey: string) {
        this.gossip = new InMemoryGossip();
        this.pbft = new PBFT(this.publicKey, totalNodes, this.gossip, block => this.onNewBlock(block));
    }

    public suggestBlock(block: string): void {
        this.pbft.suggestBlock(block);
    }

    public suggestBlockTo(block: string, ...nodes: Node[]): void {
        nodes.forEach(node => {
            this.gossip.unicast(node.publicKey, "suggest-block", { senderPublicKey: this.publicKey, block });
        });
    }

    public getLatestBlock(): string {
        return this.latestBlock;
    }
    private onNewBlock(block: string): void {
        this.latestBlock = "I do what I want";
    }
}