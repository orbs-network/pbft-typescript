import { Block } from "../Block";
import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Node } from "./Node";
import { theGenesisBlock } from "../BlockBuilder";

export class ByzantineNode implements Node {
    public gossip: Gossip;

    private latestBlock: Block;
    private pbft: PBFT;

    constructor(totalNodes: number, public publicKey: string) {
        this.gossip = new InMemoryGossip();
        this.pbft = new PBFT(theGenesisBlock.hash, this.publicKey, totalNodes, this.gossip, block => this.onNewBlock(block));
    }

    public suggestBlock(block: Block): void {
        this.pbft.suggestBlock(block);
    }

    public suggestBlockTo(block: Block, ...nodes: Node[]): void {
        nodes.forEach(node => {
            this.gossip.unicast(node.publicKey, "suggest-block", { senderPublicKey: this.publicKey, block });
        });
    }

    public getLatestBlock(): Block {
        return this.latestBlock;
    }
    private onNewBlock(block: Block): void {
        this.latestBlock = { content: "FOO BAR", hash: "DUMMY", previousBlockHash: "NOTHING" };
    }
}