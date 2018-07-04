import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "../gossip/Payload";

export interface PBFTMessagesHandler {
    onReceivePrePrepare(senderId: string, payload: PrePreparePayload): any;
    onReceivePrepare(senderId: string, payload: PreparePayload): any;
    onReceiveViewChange(senderId: string, payload: ViewChangePayload): any;
    onReceiveCommit(senderId: string, payload: CommitPayload): any;
    onReceiveNewView(senderId: string, payload: NewViewPayload): any;
}
