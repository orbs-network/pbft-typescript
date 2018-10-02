import { CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage } from "./Messages";

export interface NetworkCommunication {
    requestOrderedCommittee(seed: number): string[];
    isMember(pk: string): boolean;

    sendPrePrepare(pks: string[], message: PrePrepareMessage): void;
    sendPrepare(pks: string[], message: PrepareMessage): void;
    sendCommit(pks: string[], message: CommitMessage): void;
    sendViewChange(pk: string, message: ViewChangeMessage): void;
    sendNewView(pks: string[], message: NewViewMessage): void;

    registerToPrePrepare(cb: (message: PrePrepareMessage) => void): void;
    registerToPrepare(cb: (message: PrepareMessage) => void): void;
    registerToCommit(cb: (message: CommitMessage) => void): void;
    registerToViewChange(cb: (message: ViewChangeMessage) => void): void;
    registerToNewView(cb: (message: NewViewMessage) => void): void;
}