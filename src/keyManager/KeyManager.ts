import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../networkCommunication/Messages";

export interface KeyManager {
    signBlockRef(blockRef: BlockRef): string;
    signViewChange(viewChangeHeader: ViewChangeHeader): string;
    signNewView(newViewHeader: NewViewHeader): string;

    verifyBlockRef(blockRef: BlockRef, sender: SenderSignature): boolean;
    verifyViewChange(viewChangeHeader: ViewChangeHeader, sender: SenderSignature): boolean;
    verifyNewView(newViewHeader: NewViewHeader, sender: SenderSignature): boolean;

    getMyPublicKey(): string;
}