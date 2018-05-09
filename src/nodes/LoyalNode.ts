import { Block } from "../Block";
import { theGenesisBlock } from "../BlockBuilder";
import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Node } from "./Node";

export class LoyalNode implements Node {
    public gossip: Gossip;
    public blockLog: Block[] = [];

    private pbft: PBFT;

    constructor(totalNodes: number, public publicKey: string) {
        this.gossip = new InMemoryGossip();
        this.pbft = new PBFT(theGenesisBlock.hash, publicKey, totalNodes, this.gossip, block => this.onNewBlock(block));
    }

    public suggestBlock(block: Block): void {
        this.pbft.suggestBlock(block);
    }

    public getLatestBlock(): Block {
        return this.blockLog[this.blockLog.length - 1];
    }
    public onNewBlock(block: Block): void {
        this.blockLog.push(block);
    }
}