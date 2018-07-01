import { CommitPayload, NewViewPayload, PreparePayload, PrePreparePayload, ViewChangePayload } from "./Payload";

export type PreprepareCallback = (message: "preprepare", senderId: string, payload: PrePreparePayload) => void;
export type PrepareCallback = (message: "prepare", senderId: string, payload: PreparePayload) => void;
export type CommitCallback = (message: "commit", senderId: string, payload: CommitPayload) => void;
export type ViewChangeCallback = (message: "view-change", senderId: string, payload: ViewChangePayload) => void;
export type NewViewCallback = (message: "new-view", senderId: string, payload: NewViewPayload) => void;

export interface Gossip {
    subscribe(message: "preprepare", cb: PreprepareCallback): number;
    subscribe(message: "prepare", cb: PrepareCallback): number;
    subscribe(message: "commit", cb: CommitCallback): number;
    subscribe(message: "view-change", cb: ViewChangeCallback): number;
    subscribe(message: "new-view", cb: NewViewCallback): number;
    unsubscribe(subscriptionToken: number): void;

    broadcast(senderId: string, message: "preprepare", payload: PrePreparePayload): void;
    broadcast(senderId: string, message: "prepare", payload: PreparePayload): void;
    broadcast(senderId: string, message: "commit", payload: CommitPayload): void;
    broadcast(senderId: string, message: "view-change", payload: ViewChangePayload): void;
    broadcast(senderId: string, message: "new-view", payload: NewViewPayload): void;

    unicast(senderId: string, targetId: string, message: "preprepare", payload: PrePreparePayload): void;
    unicast(senderId: string, targetId: string, message: "prepare", payload: PreparePayload): void;
    unicast(senderId: string, targetId: string, message: "view-change", payload: ViewChangePayload): void;
    unicast(senderId: string, targetId: string, message: "new-view", payload: NewViewPayload): void;

    multicast(senderId: string, targetsIds: string[], message: "preprepare", payload: PrePreparePayload): void;
    multicast(senderId: string, targetsIds: string[], message: "prepare", payload: PreparePayload): void;
    multicast(senderId: string, targetsIds: string[], message: "commit", payload: CommitPayload): void;
    multicast(senderId: string, targetsIds: string[], message: "view-change", payload: ViewChangePayload): void;
    multicast(senderId: string, targetsIds: string[], message: "new-view", payload: NewViewPayload): void;
}
