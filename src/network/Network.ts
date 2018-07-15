import { Payload } from "./Payload";

export type MessageTypes = "preprepare" | "prepare" | "commit" | "view-change" | "new-view";

export interface Network {
    getNetworkMembersPKs(seed: string): string[]; // ordered
    sendToMembers(publicKeys: string[], messageType: string, message: any): void;
    subscribeToMessages(cb: (messageType: string, payload: any) => void): number;
    unsubscribeFromMessages(subscription: number): void;
    isMember(publicKey: string): boolean; // federation
}