import { Gossip, MessageTypes } from "../gossip/Gossip";
import { Network } from "../network/Network";
import { PBFTMessagesHandler } from "./PBFTMessagesHandler";

export class PBFTGossipFilter {
    private gossipSubscriptionToken: number;
    private term: number;
    private messagesHandler: PBFTMessagesHandler;

    constructor(private readonly gossip: Gossip, private id: string, private readonly network: Network) {
        this.subscribeToGossip();
    }

    private onGossipMessage(message: MessageTypes, senderId: string, payload: any): void {
        if (this.messagesHandler === undefined) {
            return;
        }

        if (senderId === this.id) {
            return;
        }

        if (this.network.isMember(senderId) === false) {
            return;
        }

        if (this.term !== payload.term) {
            return;
        }

        switch (message) {
            case "preprepare": {
                this.messagesHandler.onReceivePrePrepare(senderId, payload);
                break;
            }
            case "prepare": {
                this.messagesHandler.onReceivePrepare(senderId, payload);
                break;
            }
            case "commit": {
                this.messagesHandler.onReceiveCommit(senderId, payload);
                break;
            }
            case "view-change": {
                this.messagesHandler.onReceiveViewChange(senderId, payload);
                break;
            }
            case "new-view": {
                this.messagesHandler.onReceiveNewView(senderId, payload);
                break;
            }
        }
    }

    private subscribeToGossip(): void {
        this.gossipSubscriptionToken = this.gossip.subscribe((message: MessageTypes, senderId: string, payload: any) => this.onGossipMessage(message, senderId, payload));
    }

    private unsubscribeFromGossip(): void {
        if (this.gossipSubscriptionToken) {
            this.gossip.unsubscribe(this.gossipSubscriptionToken);
            this.gossipSubscriptionToken = undefined;
        }
    }

    public setTerm(term: number, messagesHandler: PBFTMessagesHandler) {
        this.term = term;
        this.messagesHandler = messagesHandler;
    }
    public dispose(): any {
        this.unsubscribeFromGossip();
    }
}