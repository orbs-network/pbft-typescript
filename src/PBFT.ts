import { Block } from "./Block";
import { BlockStorage } from "./blockStorage/BlockStorage";
import { BlocksValidator } from "./blocksValidator/BlocksValidator";
import { Config } from "./Config";
import { PBFTTerm, TermConfig } from "./PBFTTerm";
import { NetworkMessagesFilter } from "./networkCommunication/NetworkMessagesFilter";
import { InMemoryPBFTStorage } from "./storage/InMemoryPBFTStorage";
import { BlockUtils } from "./blockUtils/BlockUtils";

export type onCommittedCB = (block: Block) => Promise<void>;

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private readonly blockStorage: BlockStorage;
    private readonly pbftTermConfig: TermConfig;
    private pbftTerm: PBFTTerm;
    private networkMessagesFilter: NetworkMessagesFilter;

    constructor(config: Config) {
        this.onCommittedListeners = [];
        this.blockStorage = config.blockStorage;

        this.pbftTermConfig = PBFT.buildTermConfig(config);
        this.networkMessagesFilter = new NetworkMessagesFilter(config.networkCommunication, config.keyManager.getMyPublicKey());
    }

    public static buildTermConfig(config: Config): TermConfig {
        return {
            electionTriggerFactory: config.electionTriggerFactory,
            networkCommunication: config.networkCommunication,
            pbftStorage: config.pbftStorage || new InMemoryPBFTStorage(config.logger),
            keyManager: config.keyManager,
            logger: config.logger,
            blockUtils: new BlockUtils(config.blocksValidator, config.blocksProvider, config.blockStorage, config.logger)
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

    private async createPBFTTerm(): Promise<void> {
        const term: number = await this.blockStorage.getBlockChainHeight();
        this.pbftTerm = new PBFTTerm(this.pbftTermConfig, term, async block => {
            this.disposePBFTTerm();
            await this.notifyCommitted(block);
            await this.createPBFTTerm();
        });
        this.networkMessagesFilter.setTerm(term, this.pbftTerm);
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
        this.networkMessagesFilter.dispose();
    }
}