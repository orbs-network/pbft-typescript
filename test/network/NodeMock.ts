import { Block } from "../../src/Block";
import { BlockStorage } from "../../src/blockStorage/BlockStorage";
import { PBFT } from "../../src/PBFT";
import { Node } from "./Node";

export class NodeMock implements Node {
    public id: string;

    constructor(public pbft: PBFT, private blockStorage: BlockStorage) {
        this.id = pbft.id;
        this.pbft.registerToOnNewBlock(block => this.onNewBlock(block));
    }

    public async getLatestBlock(): Promise<Block> {
        const block: Block = await this.blockStorage.getTopMostBlock();
        return block;
    }

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    public onNewBlock(block: Block): void {
        this.blockStorage.appendBlockToChain(block);
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