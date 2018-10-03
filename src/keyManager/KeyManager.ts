import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../networkCommunication/Messages";

export interface KeyManager {
    signBlockRef(blockRef: BlockRef): SenderSignature;
    signViewChange(viewChangeHeader: ViewChangeHeader): SenderSignature;
    signNewView(newViewHeader: NewViewHeader): SenderSignature;

    verifyBlockRef(blockRef: BlockRef, sender: SenderSignature): boolean;
    verifyViewChange(viewChangeHeader: ViewChangeHeader, sender: SenderSignature): boolean;
    verifyNewView(newViewHeader: NewViewHeader, sender: SenderSignature): boolean;

    getMyPublicKey(): string;
}