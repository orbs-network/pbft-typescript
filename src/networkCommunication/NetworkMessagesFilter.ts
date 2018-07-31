import { PBFTMessagesHandler } from "./PBFTMessagesHandler";
import { Payload, PrePreparePayload } from "./Payload";
import { NetworkCommunication } from "./NetworkCommunication";

interface GossipMessageContent {
    message: string;
    term: number;
    payload: Payload;
}

export class NetworkMessagesFilter {
    private networkMessagesSubscriptionToken: number;
    private term: number;
    private messagesHandler: PBFTMessagesHandler;
    private messagesCache: GossipMessageContent[] = [];

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

        if (payload.data.term < this.term) {
            return;
        }

        const messageContent: GossipMessageContent = {
            message,
            payload,
            term: payload.data.term
        };

        if (payload.data.term > this.term) {
            this.messagesCache.push(messageContent);
            return;
        }

        this.processGossipMessage(messageContent);
    }

    private processGossipMessage({message, payload}: GossipMessageContent): void {
        switch (message) {
            case "preprepare": {
                this.messagesHandler.onReceivePrePrepare(payload as PrePreparePayload);
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

    private consumeCacheMessages(): void {
        this.messagesCache = this.messagesCache.reduce((prev, current) => {
            if (current.term === this.term) {
                this.processGossipMessage(current);
            } else {
                prev.push(current);
            }
            return prev;
        }, []);
    }

    public setTerm(term: number, messagesHandler: PBFTMessagesHandler) {
        this.term = term;
        this.messagesHandler = messagesHandler;
        this.consumeCacheMessages();
    }
    public dispose(): any {
        this.unsubscribeFromGossip();
    }
}