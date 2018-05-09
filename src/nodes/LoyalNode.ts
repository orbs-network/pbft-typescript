import { Block } from "../Block";
import { theGenesisBlock } from "../BlockBuilder";
import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { Network } from "./Network";
import { Node } from "./Node";

export class LoyalNode implements Node {
    public gossip: Gossip;
    public blockLog: Block[] = [];

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

    public getLatestBlock(): Block {
        return this.blockLog[this.blockLog.length - 1];
    }
    public onNewBlock(block: Block): void {
        this.blockLog.push(block);
    }
}