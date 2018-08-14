import { PrePreparePayload, PreparePayload, CommitPayload, ViewChangePayload, NewViewPayload } from "./Payload";

export interface NetworkCommunication {
    getMembersPKs(seed: number): string[];
    isMember(pk: string): boolean;

    sendPrePrepare(pks: string[], payload: PrePreparePayload): void;
    sendPrepare(pks: string[], payload: PreparePayload): void;
    sendCommit(pks: string[], payload: CommitPayload): void;
    sendViewChange(pk: string, payload: ViewChangePayload): void;
    sendNewView(pks: string[], payload: NewViewPayload): void;

    registerToPrePrepare(cb: (payload: PrePreparePayload) => void): void;
    registerToPrepare(cb: (payload: PreparePayload) => void): void;
    registerToCommit(cb: (payload: CommitPayload) => void): void;
    registerToViewChange(cb: (payload: ViewChangePayload) => void): void;
    registerToNewView(cb: (payload: NewViewPayload) => void): void;
}