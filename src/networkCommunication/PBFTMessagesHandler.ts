import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./Payload";

export interface PBFTMessagesHandler {
    onReceivePrePrepare(payload: PrePreparePayload): any;
    onReceivePrepare(payload: PreparePayload): any;
    onReceiveViewChange(payload: ViewChangePayload): any;
    onReceiveCommit(payload: CommitPayload): any;
    onReceiveNewView(payload: NewViewPayload): any;
}
