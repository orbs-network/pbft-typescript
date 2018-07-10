import { Block } from "./Block";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { Gossip } from "./gossip/Gossip";
import { PBFTGossipFilter } from "./gossipFilter/PBFTGossipFilter";
import { PBFTTerm } from "./PBFTTerm";
import { InMemoryBlockStorage } from "../test/blockStorage/InMemoryBlockStorage";

export type onCommittedCB = (block: Block) => Promise<void>;

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private readonly blockStorage: BlockStorage;
    private pbftTerm: PBFTTerm;
    private pbftGossipFilter: PBFTGossipFilter;
    private readonly pbftTermConfig: Config;

    public readonly id: string;
    public readonly gossip: Gossip;

    constructor(config: Config) {
        this.onCommittedListeners = [];
        this.id = config.id;
        this.blockStorage = config.blockStorage || new InMemoryBlockStorage();

        this.pbftTermConfig = this.createTermConfig(config);
        this.pbftGossipFilter = new PBFTGossipFilter(config.gossip, this.id, config.network);

        // config
        this.gossip = config.gossip;
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

    private createTermConfig(config: Config): Config {
        const result: Config = { ...config };
        result.blocksValidator = this.overrideBlockValidation(result.blocksValidator);
        return result;
    }

    private overrideBlockValidation(blocksValidator: BlocksValidator): BlocksValidator {
        return {
            validateBlock: async (block: Block): Promise<boolean> => {
                const topBlock: Block = await this.blockStorage.getLastBlockHash();
                if (topBlock.header.hash !== block.header.prevBlockHash) {
                    return false;
                }
                return blocksValidator.validateBlock(block);
            }
        };
    }

    private async createPBFTTerm(): Promise<void> {
        const term: number = await this.blockStorage.getBlockChainHeight();
        this.pbftTerm = new PBFTTerm(this.pbftTermConfig, term, async block => {
            this.disposePBFTTerm();
            await this.notifyCommitted(block);
            await this.createPBFTTerm();
        });
        this.pbftGossipFilter.setTerm(term, this.pbftTerm);
    }

    public isLeader(): boolean {
        if (this.pbftTerm !== undefined) {
            return this.pbftTerm.leaderId() === this.id;
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