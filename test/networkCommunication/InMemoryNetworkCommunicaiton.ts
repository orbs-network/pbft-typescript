import { CommitMessage, LeanHelixMessage, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private PPCallback: (message: PrePrepareMessage) => void;
    private PCallback: (message: PrepareMessage) => void;
    private CCallback: (message: CommitMessage) => void;
    private VCCallback: (message: ViewChangeMessage) => void;
    private NVCallback: (message: NewViewMessage) => void;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((message: LeanHelixMessage) => this.onGossipMessage(message));
    }

    private onGossipMessage(message: LeanHelixMessage): void {
        switch (message.signedHeader.messageType) {
            case MessageType.PREPREPARE: {
                if (this.PPCallback) {
                    this.PPCallback(message as PrePrepareMessage);
                }
                break;
            }
            case MessageType.PREPARE: {
                if (this.PCallback) {
                    this.PCallback(message as PrepareMessage);
                }
                break;
            }
            case MessageType.COMMIT: {
                if (this.CCallback) {
                    this.CCallback(message as CommitMessage);
                }
                break;
            }
            case MessageType.VIEW_CHANGE: {
                if (this.VCCallback) {
                    this.VCCallback(message as ViewChangeMessage);
                }
                break;
            }
            case MessageType.NEW_VIEW: {
                if (this.NVCallback) {
                    this.NVCallback(message as NewViewMessage);
                }
                break;
            }
        }

    }

    getMembersPKs(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendPrePrepare(pks: string[], message: PrePrepareMessage): void {
        this.gossip.multicast(pks, message);
    }

    sendPrepare(pks: string[], message: PrepareMessage): void {
        this.gossip.multicast(pks, message);
    }

    sendCommit(pks: string[], message: CommitMessage): void {
        this.gossip.multicast(pks, message);
    }

    sendViewChange(pk: string, message: ViewChangeMessage): void {
        this.gossip.multicast([pk], message);
    }

    sendNewView(pks: string[], message: NewViewMessage): void {
        this.gossip.multicast(pks, message);
    }

    registerToPrePrepare(cb: (message: PrePrepareMessage) => void): void {
        this.PPCallback = cb;
    }

    registerToPrepare(cb: (message: PrepareMessage) => void): void {
        this.PCallback = cb;
    }

    registerToCommit(cb: (message: CommitMessage) => void): void {
        this.CCallback = cb;
    }

    registerToViewChange(cb: (message: ViewChangeMessage) => void): void {
        this.VCCallback = cb;
    }

    registerToNewView(cb: (message: NewViewMessage) => void): void {
        this.NVCallback = cb;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }
}