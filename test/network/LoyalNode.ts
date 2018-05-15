import { Block } from "../../src/Block";
import { Config } from "../../src/Config";
import { PBFT } from "../../src/PBFT";
import { Gossip } from "../../src/gossip/Gossip";
import { Logger } from "../../src/logger/Logger";
import { Network } from "../../src/network/Network";
import { Node } from "../../src/network/Node";
import { PBFTStorage } from "../../src/storage/PBFTStorage";
import { theGenesisBlock } from "../builders/BlockBuilder";
import { InMemoryGossip } from "../gossip/InMemoryGossip";

export class LoyalNode implements Node {
    private pbft: PBFT;

    public gossip: Gossip;
    public blockLog: Block[] = [];
    public config: Config;

    constructor(private network: Network, private pbftStorage: PBFTStorage, private logger: Logger, public publicKey: string) {
    }

    public init(): void {
        this.gossip = new InMemoryGossip();
        this.config = {
            genesisBlockHash: theGenesisBlock.hash,
            publicKey: this.publicKey,
            network: this.network,
            gossip: this.gossip,
            logger: this.logger,
            pbftStorage: this.pbftStorage,
            onNewBlock: block => this.onNewBlock(block)
        };
        this.pbft = new PBFT(this.config);
    }

    public suggestBlock(block: Block): void {
        this.pbft.suggestBlockAsLeader(block);
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

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}