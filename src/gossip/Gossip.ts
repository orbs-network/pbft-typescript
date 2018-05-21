export type GossipCallback = (senderId: string, payload: any) => void;

export interface Gossip {
    subscribe(message: string, cb: GossipCallback): number;
    unsubscribe(subscriptionToken: number): void;
    broadcast(message: string, payload: any): void;
    unicast(nodeId: string, message: string, payoad: any): void;
}
