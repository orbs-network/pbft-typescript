import { Block } from "../../src/Block";
import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { Gossip } from "../../src/gossip/Gossip";
import { PrePreparePayload } from "../../src/gossip/Payload";
import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { theGenesisBlock } from "../BlockBuilder";
import { InMemoryGossip } from "../gossip/InMemoryGossip";

export class ByzantineNode implements Node {
    public gossip: Gossip;

    private pbft: PBFT;
    private latestBlock: Block;

    constructor(private network: Network, public publicKey: string) {
    }

    public init(): void {
        this.gossip = new InMemoryGossip();
        const config: Config = {
            genesisBlockHash: theGenesisBlock.hash,
            publicKey: this.publicKey,
            network: this.network,
            gossip: this.gossip,
            onNewBlock: block => this.onNewBlock(block)
        };
        this.pbft = new PBFT(config);
    }

    public suggestBlock(block: Block): void {
        this.pbft.suggestBlockAsLeader(block);
    }

    public suggestBlockTo(block: Block, ...nodes: Node[]): void {
        nodes.forEach(node => {
            const payload: PrePreparePayload = {
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

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    private onNewBlock(block: Block): void {
        this.latestBlock = { content: "FOO BAR", hash: "DUMMY", previousBlockHash: "NOTHING" };
    }
}