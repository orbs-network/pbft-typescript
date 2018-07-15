export interface NetworkCommunication {
    getMembersPKs(seed: number): string[];
    sendToMembers(pks: string[], messageType: string, message: any): void;
    subscribeToMessages(cb: (messageType: string, payload: any) => void): number;
    unsubscribeFromMessages(subscription: number): void;
    isMember(pk: string): boolean;
}