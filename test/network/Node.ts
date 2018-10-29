import { Config, ElectionTrigger, PBFTStorage, Logger } from "../../src";
import { Block } from "../../src/Block";
import { PBFT } from "../../src/PBFT";
import { InMemoryBlockChain } from "../InMemoryBlockChain/InMemoryBlockChain";
import { ElectionTriggerMock } from "../electionTrigger/ElectionTriggerMock";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { InMemoryPBFTStorage } from "../../src/storage/InMemoryPBFTStorage";
import { BlockUtilsMock } from "../blockUtils/BlockUtilsMock";
import { Gossip } from "../gossip/Gossip";
import { PBFTMessagesHandlerMock } from "../networkMessagesFilter/PBFTMessagesHandlerMock";

export class Node {
    public publicKey: string;
    public keyManager: KeyManagerMock;
    public pbftStorage: InMemoryPBFTStorage;
    public electionTrigger: ElectionTriggerMock;
    public blockUtils: BlockUtilsMock;
    public gossip: Gossip;

    private logger: Logger;
    private pbft: PBFT;
    private blockChain: InMemoryBlockChain;

    constructor(publicKey: string, logger: Logger, gossip: Gossip, blockUtils: BlockUtilsMock) {
        this.publicKey = publicKey;
        this.logger = logger;
        this.gossip = gossip;
        this.blockUtils = blockUtils;
        this.pbftStorage = new InMemoryPBFTStorage(this.logger);
        this.electionTrigger = new ElectionTriggerMock();
        this.keyManager = new KeyManagerMock(this.publicKey);

        this.pbft = new PBFT(this.buildConfig());
        this.blockChain = new InMemoryBlockChain();
        this.pbft.registerOnCommitted(block => this.onNewBlock(block));
    }

    public getLatestCommittedBlock(): Block {
        return this.blockChain.getLastBlock();
    }

    public isLeader(): boolean {
        return this.pbft.isLeader();
    }

    public triggerElection(): void {
        this.electionTrigger.trigger();
    }

    public buildConfig(): Config {
        return {
            networkCommunication: this.gossip,
            logger: this.logger,
            blockUtils: this.blockUtils,
            keyManager: this.keyManager,
            pbftStorage: this.pbftStorage,
            electionTrigger: this.electionTrigger,
        };
    }
    private onNewBlock(block: Block): void {
        this.blockChain.appendBlockToChain(block);
    }

    public startConsensus(): void {
        if (this.pbft) {
            const lastCommittedBlock: Block = this.getLatestCommittedBlock();
            this.pbft.start(lastCommittedBlock.getHeight() + 1);
        }
    }

    public dispose(): void {
        if (this.pbft) {
            this.pbft.dispose();
        }
    }
}