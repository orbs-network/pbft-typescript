import { CommitMessage, LeanHelixMessage, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, BlockRefMessage } from "./Messages";
import { NetworkCommunication } from "./NetworkCommunication";
import { MessagesHandler } from "./MessagesHandler";

export class NetworkMessagesFilter implements MessagesHandler {
    private blockHeight: number;
    private PBFTMessagesHandler: MessagesHandler;
    private messagesCache: LeanHelixMessage[] = [];

    constructor(private readonly networkCommunication: NetworkCommunication, private myPk: string) {
        this.networkCommunication.registerHandler(this);
    }

    private onGossipMessage(message: LeanHelixMessage): void {
        if (this.PBFTMessagesHandler === undefined) {
            return;
        }

        const { senderPublicKey: senderPk } = message.sender;
        if (senderPk === this.myPk) {
            return;
        }

        if (this.networkCommunication.isMember(senderPk) === false) {
            return;
        }

        if (message.signedHeader.blockHeight < this.blockHeight) {
            return;
        }

        if (message.signedHeader.blockHeight > this.blockHeight) {
            this.messagesCache.push(message);
            return;
        }

        this.processGossipMessage(message);
    }

    private processGossipMessage(message: LeanHelixMessage): void {
        switch (message.signedHeader.messageType) {
            case MessageType.PREPREPARE: {
                this.PBFTMessagesHandler.onReceivePrePrepare(message as PrePrepareMessage);
                break;
            }
            case MessageType.PREPARE: {
                this.PBFTMessagesHandler.onReceivePrepare(message as PrepareMessage);
                break;
            }
            case MessageType.COMMIT: {
                this.PBFTMessagesHandler.onReceiveCommit(message as CommitMessage);
                break;
            }
            case MessageType.VIEW_CHANGE: {
                this.PBFTMessagesHandler.onReceiveViewChange(message as ViewChangeMessage);
                break;
            }
            case MessageType.NEW_VIEW: {
                this.PBFTMessagesHandler.onReceiveNewView(message as NewViewMessage);
                break;
            }
        }
    }

    private consumeCacheMessages(): void {
        this.messagesCache = this.messagesCache.reduce((prev, current) => {
            if (current.signedHeader.blockHeight === this.blockHeight) {
                this.processGossipMessage(current);
            } else {
                prev.push(current);
            }
            return prev;
        }, []);
    }

    public onReceivePrePrepare(message: PrePrepareMessage) {
        this.onGossipMessage(message);
    }

    public onReceivePrepare(message: BlockRefMessage) {
        this.onGossipMessage(message);
    }

    public onReceiveViewChange(message: ViewChangeMessage) {
        this.onGossipMessage(message);
    }

    public onReceiveCommit(message: BlockRefMessage) {
        this.onGossipMessage(message);
    }

    public onReceiveNewView(message: NewViewMessage) {
        this.onGossipMessage(message);
    }

    public setBlockHeight(blockHeight: number, messagesHandler: MessagesHandler) {
        this.blockHeight = blockHeight;
        this.PBFTMessagesHandler = messagesHandler;
        this.consumeCacheMessages();
    }
}