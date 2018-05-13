import { Block } from "../../src/Block";
import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { Gossip } from "../../src/gossip/Gossip";
import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { theGenesisBlock } from "../BlockBuilder";
import { InMemoryGossip } from "../gossip/InMemoryGossip";

export class LoyalNode implements Node {
    private pbft: PBFT;

    public gossip: Gossip;
    public blockLog: Block[] = [];

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

    public getLatestBlock(): Block {
        return this.blockLog[this.blockLog.length - 1];
    }

    public onNewBlock(block: Block): void {
        this.blockLog.push(block);
    }
}