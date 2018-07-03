import { Block } from "./Block";
import { Config } from "./Config";
import { Gossip, MessageTypes } from "./gossip/Gossip";
import { PrePreparePayload } from "./gossip/Payload";
import { Logger } from "./logger/Logger";
import { PBFT1Height } from "./PBFT1Height";

export type onNewBlockCB = (block: Block) => void;

export class PBFT {
    private readonly committedBlocksHashs: string[];
    private readonly onNewBlockListeners: onNewBlockCB[];
    private readonly logger: Logger;
    private gossipSubscriptionToken: number;
    private term: number;
    private pbft1Height: PBFT1Height;

    public readonly id: string;
    public readonly gossip: Gossip;

    constructor(private readonly config: Config) {
        this.onNewBlockListeners = [];
        this.logger = config.logger;
        this.id = config.id;

        // init committedBlocks
        this.committedBlocksHashs = [config.genesisBlockHash];

        // config
        this.gossip = config.gossip;

        this.term = 0; // TODO: this.lastCommittedBlock.height;

        this.subscriveToGossip();
    }

    private gossipFilter(message: MessageTypes, senderId: string, payload: any): void {
        if (this.pbft1Height === undefined) {
            return;
        }
        const { term } = payload;
        if (term !== this.term) {
            return;
        }

        switch (message) {
            case "preprepare": {
                const { block, term, view } = payload as PrePreparePayload;
                if (this.isBlockPointingToPreviousBlock(block) === false) {
                    this.logger.log({ Subject: "Warning", message: `term:[${term}], view:[${view}], onReceivePrePrepare from "${senderId}", block rejected because it's not pointing to the previous block` });
                    return;
                }

                this.pbft1Height.onReceivePrePrepare(senderId, payload);
                break;
            }
            case "prepare": {
                this.pbft1Height.onReceivePrepare(senderId, payload);
                break;
            }
            case "commit": {
                this.pbft1Height.onReceiveCommit(senderId, payload);
                break;
            }
            case "view-change": {
                this.pbft1Height.onReceiveViewChange(senderId, payload);
                break;
            }
            case "new-view": {
                this.pbft1Height.onReceiveNewView(senderId, payload);
                break;
            }
        }
    }

    private subscriveToGossip(): void {
        this.gossipSubscriptionToken = this.gossip.subscribe((message: MessageTypes, senderId: string, payload: any) => this.gossipFilter(message, senderId, payload));
    }

    private unsubscribeFromGossip(): void {
        if (this.gossipSubscriptionToken) {
            this.gossip.unsubscribe(this.gossipSubscriptionToken);
            this.gossipSubscriptionToken = undefined;
        }
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

    private createPBFT1Height(): void {
        this.pbft1Height = new PBFT1Height(this.config, this.term, block => {
            this.committedBlocksHashs.push(block.hash);
            this.disposePBFT1Height();
            this.term++;
            this.createPBFT1Height();
            this.notifyNewBlock(block);
        });
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
        this.unsubscribeFromGossip();
    }
}