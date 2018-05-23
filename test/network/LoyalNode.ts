import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";
import { Node } from "./Node";

export class LoyalNode implements Node {
    public blockLog: Block[] = [];
    public id: string;

    constructor(public pbft: PBFT) {
        this.id = pbft.id;
        this.pbft.registerToOnNewBlock(block => this.onNewBlock(block));
    }

    public async suggestBlock(block: Block): Promise<void> {
        this.pbft.suggestBlockAsLeader(block);
    }

    public getLatestBlock(): Block {
        return this.blockLog[this.blockLog.length - 1];
    }

    public isLeader(): boolean {
        return this.pbft.leaderId() === this.pbft.id;
    }

    public onNewBlock(block: Block): void {
        this.blockLog.push(block);
    }

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}