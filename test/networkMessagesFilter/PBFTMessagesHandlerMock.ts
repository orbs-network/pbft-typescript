import { CommitMessage, NewViewMessage, PrepareMessage, ViewChangeMessage, PrePrepareMessage } from "../../src/networkCommunication/Messages";
import { MessagesHandler } from "../../src/networkCommunication/MessagesHandler";

export class PBFTMessagesHandlerMock implements MessagesHandler {
    public onReceivePrePrepare(message: PrePrepareMessage): any {

    }
    public onReceivePrepare(message: PrepareMessage): any {

    }
    public onReceiveViewChange(message: ViewChangeMessage): any {

    }
    public onReceiveCommit(message: CommitMessage): any {

    }
    public onReceiveNewView(message: NewViewMessage): any {

    }
}