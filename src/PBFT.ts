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
    private term: number;
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

        this.term = 0; // TODO: this.lastCommittedBlock.height;
    }

    private notifyCommitted(block: Block): void {
        this.onCommittedListeners.forEach(cb => cb(block));
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

    private createPBFTTerm(): void {
        this.pbftTerm = new PBFTTerm(this.pbftTermConfig, this.term, block => {
            this.disposePBFTTerm();
            this.term++;
            this.createPBFTTerm();
            this.notifyCommitted(block);
        });
        this.pbftGossipFilter.setTerm(this.term, this.pbftTerm);
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

    public restart(): void {
    }

    public dispose(): any {
        this.onCommittedListeners.length = 0;
        this.disposePBFTTerm();
        this.pbftGossipFilter.dispose();
    }
}