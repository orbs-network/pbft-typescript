import { PBFT } from "../PBFT";
import { Gossip } from "../gossip/Gossip";
import { Node } from "./Node";

export class ByzantineNode implements Node {
    public publicKey: string = Math.random().toString();

    private latestBlock: string;
    private pbft: PBFT;

    constructor(public id: string, public gossip: Gossip) {
        this.pbft = new PBFT(gossip, block => this.onNewBlock(block));
    }

    public appendBlock(block: string): void {
        this.pbft.appendBlock({ senderPublicKey: this.publicKey, block });
    }

    public appendBlockTo(block: string, ...nodes: Node[]): void {
        nodes.forEach(node => {
            this.gossip.unicast(node.id, "commit", { senderPublicKey: this.publicKey, block });
        });
    }

    public getLatestBlock(): string {
        return this.latestBlock;
    }
    private onNewBlock(block: string): void {
        this.latestBlock = block;
    }
}