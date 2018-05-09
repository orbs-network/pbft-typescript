import { Block } from "../Block";
import { theGenesisBlock } from "../BlockBuilder";
import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { SuggestedBlockPayload } from "../gossip/Payload";
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
        this.pbft.suggestBlockAsLeader(block);
    }

    public suggestBlockTo(block: Block, ...nodes: Node[]): void {
        nodes.forEach(node => {
            const payload: SuggestedBlockPayload = {
                block,
                senderPublicKey: this.publicKey,
                view: 0
            };
            this.gossip.unicast(node.publicKey, "preprepare", payload);
        });
    }

    public getLatestBlock(): Block {
        return this.latestBlock;
    }
    private onNewBlock(block: Block): void {
        this.latestBlock = { content: "FOO BAR", hash: "DUMMY", previousBlockHash: "NOTHING" };
    }
}