import { NewViewPayload, PrePreparePayload, PreparePayload, ViewChangePayload } from "./Payload";

export type PreprepareCallback = (senderId: string, payload: PrePreparePayload) => void;
export type PrepareCallback = (senderId: string, payload: PreparePayload) => void;
export type ViewChangeCallback = (senderId: string, payload: ViewChangePayload) => void;
export type NewViewCallback = (senderId: string, payload: NewViewPayload) => void;

export interface Gossip {
    subscribe(message: "preprepare", cb: PreprepareCallback): number;
    subscribe(message: "prepare", cb: PrepareCallback): number;
    subscribe(message: "view-change", cb: ViewChangeCallback): number;
    subscribe(message: "new-view", cb: NewViewCallback): number;
    unsubscribe(subscriptionToken: number): void;

    broadcast(message: "preprepare", payload: PrePreparePayload): void;
    broadcast(message: "prepare", payload: PreparePayload): void;
    broadcast(message: "view-change", payload: ViewChangePayload): void;
    broadcast(message: "new-view", payload: NewViewPayload): void;

    unicast(nodeId: string, message: "preprepare", payload: PrePreparePayload): void;
    unicast(nodeId: string, message: "prepare", payload: PreparePayload): void;
    unicast(nodeId: string, message: "view-change", payload: ViewChangePayload): void;
    unicast(nodeId: string, message: "new-view", payload: NewViewPayload): void;
}
