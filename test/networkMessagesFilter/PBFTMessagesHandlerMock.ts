import { CommitMessage, NewViewMessage, PrepareMessage, ViewChangeMessage, PrePrepareMessage } from "../../src/networkCommunication/Messages";
import { PBFTMessagesHandler } from "../../src/networkCommunication/PBFTMessagesHandler";

export class PBFTMessagesHandlerMock implements PBFTMessagesHandler {
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