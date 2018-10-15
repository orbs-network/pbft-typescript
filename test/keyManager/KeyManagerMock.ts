import { KeyManager } from "../../src/keyManager/KeyManager";
import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../../src/networkCommunication/Messages";

const PRIVATE_KEY_PREFIX = "PRIVATE_KEY";

export class KeyManagerMock implements KeyManager {
    constructor(private myPublicKey: string, private rejectedPKs: string[] = []) {
    }

    sign(data: string): SenderSignature {
        const signature = `${PRIVATE_KEY_PREFIX}-${this.myPublicKey}-${data}`;
        return {
            senderPublicKey: this.myPublicKey,
            signature
        };
    }

    verify(signedData: string, sender: SenderSignature): boolean {
        const { signature, senderPublicKey } = sender;

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
        if (signedData !== withoutPublicKey) {
            return false;
        }

        return true;
    }

    getMyPublicKey(): string {
        return this.myPublicKey;
    }

}