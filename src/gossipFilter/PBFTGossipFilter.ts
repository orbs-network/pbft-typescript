import { Gossip, MessageTypes } from "../gossip/Gossip";
import { Network } from "../network/Network";
import { PBFTMessagesHandler } from "./PBFTMessagesHandler";
import { Payload } from "../gossip/Payload";

export class PBFTGossipFilter {
    private gossipSubscriptionToken: number;
    private term: number;
    private messagesHandler: PBFTMessagesHandler;

    constructor(private readonly network: Network) {
        this.subscribeToGossip();
    }

    private onGossipMessage(messageType: MessageTypes, payload: Payload): void {
        if (this.messagesHandler === undefined) {
            return;
        }

        if (this.network.isMember(payload.pk) === false) {
            return;
        }

        if (this.term !== payload.data.term) {
            return;
        }

        switch (messageType) {
            case "preprepare": {
                this.messagesHandler.onReceivePrePrepare(payload);
                break;
            }
            case "prepare": {
                this.messagesHandler.onReceivePrepare(payload);
                break;
            }
            case "commit": {
                this.messagesHandler.onReceiveCommit(payload);
                break;
            }
            case "view-change": {
                this.messagesHandler.onReceiveViewChange(payload);
                break;
            }
            case "new-view": {
                this.messagesHandler.onReceiveNewView(payload);
                break;
            }
        }
    }

    private subscribeToGossip(): void {
        this.gossipSubscriptionToken = this.network.subscribeToMessages(this.onGossipMessage);
    }

    private unsubscribeFromGossip(): void {
        if (this.gossipSubscriptionToken) {
            this.network.unsubscribeFromMessages(this.gossipSubscriptionToken);
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