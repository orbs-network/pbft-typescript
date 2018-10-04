import { CommitMessage, LeanHelixMessage, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { MessagesHandler } from "../../src/networkCommunication/MessagesHandler";

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private messagesHandler: MessagesHandler;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((message: LeanHelixMessage) => this.onGossipMessage(message));
    }

    private onGossipMessage(message: LeanHelixMessage): void {
        if (!this.messagesHandler) {
            return;
        }

        switch (message.signedHeader.messageType) {
            case MessageType.PREPREPARE: {
                this.messagesHandler.onReceivePrePrepare(message as PrePrepareMessage);
                break;
            }
            case MessageType.PREPARE: {
                this.messagesHandler.onReceivePrepare(message as PrepareMessage);
                break;
            }
            case MessageType.COMMIT: {
                this.messagesHandler.onReceiveCommit(message as CommitMessage);
                break;
            }
            case MessageType.VIEW_CHANGE: {
                this.messagesHandler.onReceiveViewChange(message as ViewChangeMessage);
                break;
            }
            case MessageType.NEW_VIEW: {
                this.messagesHandler.onReceiveNewView(message as NewViewMessage);
                break;
            }
        }

    }

    requestOrderedCommittee(seed: number): string[] {
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

    registerHandler(messagesHandler: MessagesHandler): void {
        this.messagesHandler = messagesHandler;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }
}