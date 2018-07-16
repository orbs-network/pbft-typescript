import { PBFTMessagesHandler } from "./PBFTMessagesHandler";
import { Payload } from "./Payload";
import { NetworkCommunication } from "./NetworkCommunication";

export class NetworkMessagesFilter {
    private networkMessagesSubscriptionToken: number;
    private term: number;
    private messagesHandler: PBFTMessagesHandler;

    constructor(private readonly networkCommunication: NetworkCommunication, private myPk: string) {
        this.subscribeToGossip();
    }

    private onGossipMessage(message: string, payload: Payload): void {
        if (this.messagesHandler === undefined) {
            return;
        }

        const { pk: senderPk } = payload;
        if (senderPk === this.myPk) {
            return;
        }

        if (this.networkCommunication.isMember(senderPk) === false) {
            return;
        }

        if (this.term !== payload.data.term) {
            return;
        }

        switch (message) {
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
        this.networkMessagesSubscriptionToken = this.networkCommunication.subscribeToMessages((message: string, payload: Payload) => this.onGossipMessage(message, payload));
    }

    private unsubscribeFromGossip(): void {
        if (this.networkMessagesSubscriptionToken) {
            this.networkCommunication.unsubscribeFromMessages(this.networkMessagesSubscriptionToken);
            this.networkMessagesSubscriptionToken = undefined;
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