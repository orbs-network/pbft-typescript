import { Block } from "./Block";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { PBFTTerm } from "./PBFTTerm";
import { NetworkMessagesFilter } from "./networkCommunication/NetworkMessagesFilter";
import { InMemoryPBFTStorage } from "./storage/InMemoryPBFTStorage";

export type onCommittedCB = (block: Block) => Promise<void>;

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private readonly blockStorage: BlockStorage;
    private pbftTerm: PBFTTerm;
    private NetworkMessagesFilter: NetworkMessagesFilter;
    private readonly pbftTermConfig: Config;

    constructor(config: Config) {
        this.onCommittedListeners = [];
        this.blockStorage = config.blockStorage;

        this.pbftTermConfig = this.buildTermConfig(config);
        this.NetworkMessagesFilter = new NetworkMessagesFilter(config.networkCommunication, config.keyManager.getMyPublicKey());
    }

    private buildTermConfig(config: Config): Config {
        return {
            blocksProvider: config.blocksProvider,
            blocksValidator: this.overrideBlockValidation(config.blocksValidator),
            blockStorage: config.blockStorage,
            electionTriggerFactory: config.electionTriggerFactory,
            keyManager: config.keyManager,
            logger: config.logger,
            networkCommunication: config.networkCommunication,
            pbftStorage: config.pbftStorage || new InMemoryPBFTStorage(config.logger)
        };
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

    private overrideBlockValidation(blocksValidator: BlocksValidator): BlocksValidator {
        return {
            validateBlock: async (block: Block): Promise<boolean> => {
                const topBlock: Block = await this.blockStorage.getLastBlock();
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
        this.NetworkMessagesFilter.setTerm(term, this.pbftTerm);
    }

    public isLeader(): boolean {
        if (this.pbftTerm !== undefined) {
            return this.pbftTerm.isLeader();
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
        this.NetworkMessagesFilter.dispose();
    }
}