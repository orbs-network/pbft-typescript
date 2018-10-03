import { KeyManager } from "../../src/keyManager/KeyManager";
import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../../src/networkCommunication/Messages";

const PRIVATE_KEY_PREFIX = "PRIVATE_KEY";

export class KeyManagerMock implements KeyManager {
    constructor(private myPublicKey: string, private rejectedPKs: string[] = []) {
    }

    signBlockRef(blockRef: BlockRef): SenderSignature {
        return {
            senderPublicKey: this.myPublicKey,
            signature: this.sign(blockRef)
        };
    }

    signViewChange(viewChangeHeader: ViewChangeHeader): SenderSignature {
        return {
            senderPublicKey: this.myPublicKey,
            signature: this.sign(viewChangeHeader)
        };
    }

    signNewView(newViewHeader: NewViewHeader): SenderSignature {
        return {
            senderPublicKey: this.myPublicKey,
            signature: this.sign(newViewHeader)
        };
    }

    private sign(object: any): string {
        return `${PRIVATE_KEY_PREFIX}-${this.myPublicKey}-${JSON.stringify(object)}`;
    }

    verifyBlockRef(blockRef: BlockRef, sender: SenderSignature): boolean {
        return this.verify(blockRef, sender);
    }

    verifyViewChange(viewChangeHeader: ViewChangeHeader, sender: SenderSignature): boolean {
        return this.verify(viewChangeHeader, sender);
    }

    verifyNewView(newViewHeader: NewViewHeader, sender: SenderSignature): boolean {
        return this.verify(newViewHeader, sender);
    }

    private verify(object: any, sender: SenderSignature): boolean {
        const {signature, senderPublicKey} = sender;

        if (this.rejectedPKs.indexOf(senderPublicKey) > -1) {
            return false;
        }

        if (signature.indexOf(PRIVATE_KEY_PREFIX) === -1) {
            return false;
        }

        const withoutPrefix = signature.substr(PRIVATE_KEY_PREFIX.length + 1);
        if (withoutPrefix.indexOf(senderPublicKey) === -1) {
            return false;
        }

        const withoutPublicKey = withoutPrefix.substr(senderPublicKey.length + 1);
        if (JSON.stringify(object) !== withoutPublicKey) {
            return false;
        }

        return true;
    }

    getMyPublicKey(): string {
        return this.myPublicKey;
    }

}