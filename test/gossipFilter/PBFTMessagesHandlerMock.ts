import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "../../src/gossip/Payload";
import { PBFTMessagesHandler } from "../../src/gossipFilter/PBFTMessagesHandler";

export class PBFTMessagesHandlerMock implements PBFTMessagesHandler {
    public onReceivePrePrepare(senderId: string, payload: PrePreparePayload): any {

    }
    public onReceivePrepare(senderId: string, payload: PreparePayload): any {

    }
    public onReceiveViewChange(senderId: string, payload: ViewChangePayload): any {

    }
    public onReceiveCommit(senderId: string, payload: CommitPayload): any {

    }
    public onReceiveNewView(senderId: string, payload: NewViewPayload): any {

    }
}