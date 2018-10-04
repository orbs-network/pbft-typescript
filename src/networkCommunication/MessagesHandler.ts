import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "./Messages";

export interface MessagesHandler {
    onReceivePrePrepare(message: PrePrepareMessage): any;
    onReceivePrepare(message: PrepareMessage): any;
    onReceiveViewChange(message: ViewChangeMessage): any;
    onReceiveCommit(message: CommitMessage): any;
    onReceiveNewView(message: NewViewMessage): any;
}
