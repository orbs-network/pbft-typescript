import { Block } from "../Block";
import { theGenesisBlock } from "../BlockBuilder";
import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Network } from "./Network";
import { Node } from "./Node";

export class ByzantineNode implements Node {
    public gossip: Gossip;

    private latestBlock: Block;
    private pbft: PBFT;

    constructor(private network: Network, public publicKey: string) {
    }

    public init(): void {
        this.gossip = new InMemoryGossip();
        this.pbft = new PBFT(theGenesisBlock.hash, this.publicKey, this.network, this.gossip, block => this.onNewBlock(block));
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