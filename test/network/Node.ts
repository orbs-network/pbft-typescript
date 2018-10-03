import { Config } from "../../src";
import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";
import { InMemoryBlockChain } from "../InMemoryBlockChain/InMemoryBlockChain";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";

export class Node {
    private pbft: PBFT;
    private blockChain: InMemoryBlockChain;

    constructor(public pk: string, public config: Config) {
        this.pbft = new PBFT(config);
        this.blockChain = new InMemoryBlockChain();
        this.pbft.registerOnCommitted(block => this.onNewBlock(block));
    }

    public getLatestCommittedBlock(): Block {
        return this.blockChain.getLastBlock();
    }

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    public triggerElection(): void {
        (this.config.electionTrigger as ElectionTriggerMock).trigger();
    }

    private onNewBlock(block: Block): void {
        this.blockChain.appendBlockToChain(block);
    }

    public startConsensus(): void {
        if (this.pbft) {
            const lastCommittedBlock: Block = this.getLatestCommittedBlock();
            this.pbft.start(lastCommittedBlock.getHeight() + 1);
        }
    }

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}