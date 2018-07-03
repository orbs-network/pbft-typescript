import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";
import { Node } from "./Node";

export class NodeMock implements Node {
    public blockLog: Block[] = [];
    public id: string;

    constructor(public pbft: PBFT) {
        this.id = pbft.id;
        this.pbft.registerToOnNewBlock(block => this.onNewBlock(block));
    }

    public getLatestBlock(): Block {
        return this.blockLog[this.blockLog.length - 1];
    }

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    public onNewBlock(block: Block): void {
        this.blockLog.push(block);
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