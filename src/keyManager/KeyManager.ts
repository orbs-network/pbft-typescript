import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../networkCommunication/Messages";

export interface KeyManager {
    sign(data: string): SenderSignature;
    verify(signedData: string, sender: SenderSignature): boolean;

    getMyPublicKey(): string;
}