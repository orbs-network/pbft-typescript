import { Block } from "./Block";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { Gossip } from "./gossip/Gossip";
import { PBFTGossipFilter } from "./gossipFilter/PBFTGossipFilter";
import { PBFTTerm } from "./PBFTTerm";

export type onNewBlockCB = (block: Block) => void;

export class PBFT {
    private readonly onNewBlockListeners: onNewBlockCB[];
    private readonly blockStorage: BlockStorage;
    private term: number;
    private pbftTerm: PBFTTerm;
    private pbftGossipFilter: PBFTGossipFilter;
    private readonly pbftTermConfig: Config;

    public readonly id: string;
    public readonly gossip: Gossip;

    constructor(config: Config) {
        this.onNewBlockListeners = [];
        this.id = config.id;
        this.blockStorage = config.blockStorage;

        this.pbftTermConfig = this.createTermConfig(config);
        this.pbftGossipFilter = new PBFTGossipFilter(config.gossip, this.id, config.network);

        // config
        this.gossip = config.gossip;

        this.term = 0; // TODO: this.lastCommittedBlock.height;
    }

    private notifyNewBlock(block: Block): void {
        this.onNewBlockListeners.forEach(cb => cb(block));
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
                if (this.blockStorage.getTopMostBlock().hash !== block.previousBlockHash) {
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
            this.notifyNewBlock(block);
        });
        this.pbftGossipFilter.setTerm(this.term, this.pbftTerm);
    }

    public isLeader(): boolean {
        if (this.pbftTerm !== undefined) {
            return this.pbftTerm.leaderId() === this.id;
        }
    }

    public registerToOnNewBlock(bc: (block: Block) => void): void {
        this.onNewBlockListeners.push(bc);
    }

    public start(): void {
        if (this.pbftTerm === undefined) {
            this.createPBFTTerm();
        }
    }

    public dispose(): any {
        this.onNewBlockListeners.length = 0;
        this.disposePBFTTerm();
        this.pbftGossipFilter.dispose();
    }
}