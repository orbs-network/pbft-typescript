import { Block } from "./Block";
import { Config } from "./Config";
import { NetworkMessagesFilter } from "./networkCommunication/NetworkMessagesFilter";
import { PBFTTerm, TermConfig } from "./PBFTTerm";
import { InMemoryPBFTStorage } from "./storage/InMemoryPBFTStorage";

export type onCommittedCB = (block: Block) => void;

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private readonly pbftTermConfig: TermConfig;
    private pbftTerm: PBFTTerm;
    private networkMessagesFilter: NetworkMessagesFilter;

    constructor(config: Config) {
        this.onCommittedListeners = [];

        this.pbftTermConfig = PBFT.buildTermConfig(config);
        this.networkMessagesFilter = new NetworkMessagesFilter(config.networkCommunication, config.keyManager.getMyPublicKey());
    }

    public static buildTermConfig(config: Config): TermConfig {
        return {
            electionTrigger: config.electionTrigger,
            networkCommunication: config.networkCommunication,
            pbftStorage: config.pbftStorage || new InMemoryPBFTStorage(config.logger),
            keyManager: config.keyManager,
            logger: config.logger,
            blockUtils: config.blockUtils
        };
    }

    private notifyCommitted(block: Block): void {
        this.onCommittedListeners.map(cb => cb(block));
    }

    private disposePBFTTerm(): void {
        if (this.pbftTerm) {
            this.pbftTerm.dispose();
            this.pbftTerm = undefined;
        }
    }

    private createPBFTTerm(height: number): void {
        this.pbftTerm = new PBFTTerm(this.pbftTermConfig, height, block => {
            this.notifyCommitted(block);
            this.start(block.header.height + 1);
        });
        this.networkMessagesFilter.setTerm(height, this.pbftTerm);
    }

    public isLeader(): boolean {
        if (this.pbftTerm !== undefined) {
            return this.pbftTerm.isLeader();
        }
    }

    public registerOnCommitted(bc: onCommittedCB): void {
        this.onCommittedListeners.push(bc);
    }

    public start(height: number): void {
        this.disposePBFTTerm();
        this.createPBFTTerm(height);
    }

    public dispose(): void {
        this.onCommittedListeners.length = 0;
        this.disposePBFTTerm();
    }
}