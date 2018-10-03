import { CommitMessage, LeanHelixMessage, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "./Messages";
import { NetworkCommunication } from "./NetworkCommunication";
import { PBFTMessagesHandler } from "./PBFTMessagesHandler";

export class NetworkMessagesFilter {
    private term: number;
    private messagesHandler: PBFTMessagesHandler;
    private messagesCache: LeanHelixMessage[] = [];

    constructor(private readonly networkCommunication: NetworkCommunication, private myPk: string) {
        this.subscribeToGossip();
    }

    private onGossipMessage(message: LeanHelixMessage): void {
        if (this.messagesHandler === undefined) {
            return;
        }

        const { senderPublicKey: senderPk } = message.sender;
        if (senderPk === this.myPk) {
            return;
        }

        if (this.networkCommunication.isMember(senderPk) === false) {
            return;
        }

        if (message.signedHeader.term < this.term) {
            return;
        }

        if (message.signedHeader.term > this.term) {
            this.messagesCache.push(message);
            return;
        }

        this.processGossipMessage(message);
    }

    private processGossipMessage(message: LeanHelixMessage): void {
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

    private subscribeToGossip(): void {
        this.networkCommunication.registerToPrePrepare((message: PrePrepareMessage) => this.onGossipMessage(message));
        this.networkCommunication.registerToPrepare((message: PrepareMessage) => this.onGossipMessage(message));
        this.networkCommunication.registerToCommit((message: CommitMessage) => this.onGossipMessage(message));
        this.networkCommunication.registerToViewChange((message: ViewChangeMessage) => this.onGossipMessage(message));
        this.networkCommunication.registerToNewView((message: NewViewMessage) => this.onGossipMessage(message));
    }

    private consumeCacheMessages(): void {
        this.messagesCache = this.messagesCache.reduce((prev, current) => {
            if (current.signedHeader.term === this.term) {
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
}