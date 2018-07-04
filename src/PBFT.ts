import { theGenesisBlock } from "../test/builders/BlockBuilder";
import { Block } from "./Block";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { Gossip } from "./gossip/Gossip";
import { PBFTGossipFilter } from "./gossipFilter/PBFTGossipFilter";
import { PBFT1Height } from "./PBFT1Height";

export type onNewBlockCB = (block: Block) => void;

export class PBFT {
    private readonly committedBlocksHashs: string[];
    private readonly onNewBlockListeners: onNewBlockCB[];
    private term: number;
    private pbft1Height: PBFT1Height;
    private pbftGossipFilter: PBFTGossipFilter;
    private readonly pbft1HeightConfig: Config;

    public readonly id: string;
    public readonly gossip: Gossip;

    constructor(config: Config) {
        this.onNewBlockListeners = [];
        this.id = config.id;

        this.pbft1HeightConfig = this.create1HeightConfig(config);
        this.pbftGossipFilter = new PBFTGossipFilter(config.gossip, this.id, config.network);

        // init committedBlocks
        this.committedBlocksHashs = [theGenesisBlock.hash];

        // config
        this.gossip = config.gossip;

        this.term = 0; // TODO: this.lastCommittedBlock.height;
    }

    private getLatestConfirmedBlockHash(): string {
        return this.committedBlocksHashs[this.committedBlocksHashs.length - 1];
    }

    private isBlockPointingToPreviousBlock(block: Block): boolean {
        return this.getLatestConfirmedBlockHash() === block.previousBlockHash;
    }

    private notifyNewBlock(block: Block): void {
        this.onNewBlockListeners.forEach(cb => cb(block));
    }

    private disposePBFT1Height(): void {
        if (this.pbft1Height) {
            this.pbft1Height.dispose();
            this.pbft1Height = undefined;
        }
    }

    private create1HeightConfig(config: Config): Config {
        const result: Config = { ...config };
        result.blocksValidator = this.overrideBlockValidation(result.blocksValidator);
        return result;
    }

    private overrideBlockValidation(blocksValidator: BlocksValidator): BlocksValidator {
        return {
            validateBlock: async (block: Block): Promise<boolean> => {
                if (this.isBlockPointingToPreviousBlock(block) === false) {
                    return false;
                }
                return blocksValidator.validateBlock(block);
            }
        };
    }

    private createPBFT1Height(): void {
        this.pbft1Height = new PBFT1Height(this.pbft1HeightConfig, this.term, block => {
            this.committedBlocksHashs.push(block.hash);
            this.disposePBFT1Height();
            this.term++;
            this.createPBFT1Height();
            this.notifyNewBlock(block);
        });
        this.pbftGossipFilter.setTerm(this.term, this.pbft1Height);
    }

    public isLeader(): boolean {
        if (this.pbft1Height !== undefined) {
            return this.pbft1Height.leaderId() === this.id;
        }
    }

    public registerToOnNewBlock(bc: (block: Block) => void): void {
        this.onNewBlockListeners.push(bc);
    }

    public start(): void {
        if (this.pbft1Height === undefined) {
            this.createPBFT1Height();
        }
    }

    public dispose(): any {
        this.onNewBlockListeners.length = 0;
        this.disposePBFT1Height();
        this.pbftGossipFilter.dispose();
    }
}