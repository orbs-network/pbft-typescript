import { Block } from "../../src/Block";
import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { Gossip } from "../../src/gossip/Gossip";
import { PrePreparePayload } from "../../src/gossip/Payload";
import { Logger } from "../../src/logger/Logger";
import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { theGenesisBlock } from "../builders/BlockBuilder";
import { InMemoryGossip } from "../gossip/InMemoryGossip";

export class ByzantineNode implements Node {
    public gossip: Gossip;

    private pbft: PBFT;
    private latestBlock: Block;

    constructor(
        private network: Network,
        private pbftStorage: PBFTStorage,
        private logger: Logger,
        private electionTrigger: ElectionTrigger,
        public publicKey: string) {
    }

    public init(): void {
        this.gossip = new InMemoryGossip();
        const config: Config = {
            genesisBlockHash: theGenesisBlock.hash,
            publicKey: this.publicKey,
            network: this.network,
            gossip: this.gossip,
            logger: this.logger,
            pbftStorage: this.pbftStorage,
            electionTrigger: this.electionTrigger,
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

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}