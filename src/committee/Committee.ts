export interface Committee {
    getCommitteeMembersPKs(height: number, seed: number): string[];
    sendToMembers(pks: string[]): void;
    onMessageReceived(fromAddress: string, messageType: string, message: any): void;
}