import { Block } from "./Block";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { Config } from "./Config";
import { Gossip } from "./gossip/Gossip";
import { PBFTGossipFilter } from "./gossipFilter/PBFTGossipFilter";
import { PBFTTerm, ConfigTerm, BlockUtils } from "./PBFTTerm";
import { InMemoryBlockStorage } from "../test/blockStorage/InMemoryBlockStorage";
import { BlocksProvider } from "./blocksProvider/BlocksProvider";
import { createHash,  HexBase64Latin1Encoding } from "crypto";
import * as stringify from "json-stable-stringify";
import { KeyManager } from "./keyManager/KeyManager";
import { Network } from "./network/Network";

export type onCommittedCB = (block: Block) => Promise<void>;

class PBFTBlockUtils implements BlockUtils {
    public constructor(
        private readonly blockProvider: BlocksProvider,
        private readonly blockStorage: BlockStorage) {
    }

    public async requestNewBlock(height: number): Promise<Block> {
        return this.blockProvider.requestNewBlock(height);
    }

    public async validateBlock(block: Block): Promise<boolean> {
        const lastBlock: Block = await this.blockStorage.getLastBlock();
        const lastBlockHash: string = this.calculateBlockHash(lastBlock);
        if (lastBlockHash !== block.header.prevBlockHash) {
            return false;
        }
        return this.blockProvider.validateBlock(block);
    }

    public calculateBlockHash(block: Block): string {
        const hash = createHash("sha256");
        hash.update(stringify(block.header));
        return hash.digest("base64");
    }
}

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private readonly blockStorage: BlockStorage;
    // private readonly blocksProvider: BlocksProvider;
    private pbftTerm: PBFTTerm;
    private pbftGossipFilter: PBFTGossipFilter;
    private readonly pbftTermConfig: ConfigTerm;

    public readonly network: Network;
    public readonly keyManager: KeyManager;
    public readonly gossip: Gossip;

    constructor(config: Config) {
        this.onCommittedListeners = [];
        this.blockStorage = config.blockStorage || new InMemoryBlockStorage();
        // this.blocksProvider = config.blocksProvider;

        this.pbftTermConfig = this.createTermConfig(config);
        this.pbftGossipFilter = new PBFTGossipFilter(config.network);

        // config
        this.keyManager = config.keyManager;
        this.network = config.network;
    }

    private notifyCommitted(block: Block): Promise<any> {
        return Promise.all(this.onCommittedListeners.map(cb => cb(block)));
    }

    private disposePBFTTerm(): void {
        if (this.pbftTerm) {
            this.pbftTerm.dispose();
            this.pbftTerm = undefined;
        }
    }

    private createTermConfig(config: Config): ConfigTerm {
        const blockUtils: BlockUtils = new PBFTBlockUtils(config.blocksProvider, config.blockStorage);
        const result: ConfigTerm = {...config, blockUtils};
        return result;
    }



    private async createPBFTTerm(): Promise<void> {
        const term: number = await this.blockStorage.getHeight(); // optimized - block.header.height
        const lastBlock: Block = await this.blockStorage.getLastBlock();
        // const term: number = lastBlock.header.height;
        const members: string[] = this.network.getNetworkMembersPKs(this.getSeed(lastBlock));
        this.pbftTerm = new PBFTTerm(this.pbftTermConfig, term, members, async block => {
            this.disposePBFTTerm();
            await this.notifyCommitted(block);
            await this.createPBFTTerm();
        });
        this.pbftGossipFilter.setTerm(term, this.pbftTerm);
    }

    private getSeed(block: Block): string {
        return block.header.toString();
    }

    public isLeader(): boolean {
        if (this.pbftTerm !== undefined) {
            return this.pbftTerm.getCurrentLeader() === this.keyManager.getMyPublicKey();
        }
    }

    public registerOnCommitted(bc: onCommittedCB): void {
        this.onCommittedListeners.push(bc);
    }

    public start(): void {
        if (this.pbftTerm === undefined) {
            this.createPBFTTerm();
        }
    }

    public stop(): void {
        this.disposePBFTTerm();
    }

    public restart(): void {
        this.stop();
        this.start();
    }

    public dispose(): any {
        this.onCommittedListeners.length = 0;
        this.disposePBFTTerm();
        this.pbftGossipFilter.dispose();
    }
}