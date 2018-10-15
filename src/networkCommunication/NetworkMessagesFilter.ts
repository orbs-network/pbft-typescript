import { CommitMessage, MessageType, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, deserializeMessageContent } from "./Messages";
import { NetworkCommunication } from "./NetworkCommunication";
import { MessagesHandler } from "./MessagesHandler";
import { Block } from "../Block";

export class NetworkMessagesFilter {
    private blockHeight: number;
    private PBFTMessagesHandler: MessagesHandler;
    private messagesCache: any[] = [];

    constructor(private readonly networkCommunication: NetworkCommunication, private myPk: string) {
        this.networkCommunication.registerOnMessage((messageContent: string, block: Block) => this.onGossipMessage(messageContent, block));
    }

    private onGossipMessage(messageContent: string, block: Block): void {
        if (this.PBFTMessagesHandler === undefined) {
            return;
        }

        const content = deserializeMessageContent(messageContent);
        const { senderPublicKey: senderPk } = content.sender;
        if (senderPk === this.myPk) {
            return;
        }

        if (this.networkCommunication.isMember(senderPk) === false) {
            return;
        }

        if (content.signedHeader.blockHeight < this.blockHeight) {
            return;
        }

        const message = { content, block };
        if (content.signedHeader.blockHeight > this.blockHeight) {
            this.messagesCache.push(message);
            return;
        }

        this.processGossipMessage(message);
    }

    private processGossipMessage(message: any): void {
        switch (message.content.signedHeader.messageType) {
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
            if (current.content.signedHeader.blockHeight === this.blockHeight) {
                this.processGossipMessage(current);
            } else {
                prev.push(current);
            }
            return prev;
        }, []);
    }

    public setBlockHeight(blockHeight: number, messagesHandler: MessagesHandler) {
        this.blockHeight = blockHeight;
        this.PBFTMessagesHandler = messagesHandler;
        this.consumeCacheMessages();
    }
}