import { Block } from "./Block";
import { Config } from "./Config";
import { NetworkMessagesFilter } from "./networkCommunication/NetworkMessagesFilter";
import { PBFTTerm } from "./PBFTTerm";
import { InMemoryPBFTStorage } from "./storage/InMemoryPBFTStorage";

export type onCommittedCB = (block: Block) => void;

export class PBFT {
    private readonly onCommittedListeners: onCommittedCB[];
    private pbftTerm: PBFTTerm;
    private networkMessagesFilter: NetworkMessagesFilter;

    constructor(private readonly config: Config) {
        this.onCommittedListeners = [];

        this.networkMessagesFilter = new NetworkMessagesFilter(config.networkCommunication, config.keyManager.getMyPublicKey());
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
        this.pbftTerm = new PBFTTerm(this.config, height, block => {
            this.notifyCommitted(block);
            this.start(block.getHeight() + 1);
        });
        this.networkMessagesFilter.setBlockHeight(height, this.pbftTerm);
        this.pbftTerm.startTerm();
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