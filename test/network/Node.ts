import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";
import { InMemoryBlockStorage } from "../blockStorage/InMemoryBlockStorage";
import { Config } from "../../src";

export class Node {
    private pbft: PBFT;

    constructor(public pk: string, public config: Config) {
        this.pbft = new PBFT(config);
        this.pbft.registerOnCommitted(block => this.onNewBlock(block));
    }

    public async getLatestBlock(): Promise<Block> {
        const block: Block = await this.config.blockStorage.getLastBlockHash();
        return block;
    }

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    public onNewBlock(block: Block): Promise<void> {
        (this.config.blockStorage as InMemoryBlockStorage).appendBlockToChain(block);
        return Promise.resolve();
    }

    public startConsensus(): void {
        if (this.pbft) {
            this.pbft.start();
        }
    }

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}