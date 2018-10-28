import { KeyManager } from "../../src/keyManager/KeyManager";
import { BlockRef, ViewChangeHeader, NewViewHeader, SenderSignature } from "../../src/networkCommunication/Messages";

const PRIVATE_KEY_PREFIX = "PRIVATE_KEY";

export class KeyManagerMock implements KeyManager {
    constructor(private myPublicKey: string, private rejectedPKs: string[] = []) {
    }

    sign(data: string): string {
        return `${PRIVATE_KEY_PREFIX}-${this.myPublicKey}-${data}`;
    }

    verify(signedData: string, publicKey: string, signature: string): boolean {
        if (this.rejectedPKs.indexOf(publicKey) > -1) {
            return false;
        }

        if (signature.indexOf(PRIVATE_KEY_PREFIX) === -1) {
            return false;
        }

        const withoutPrefix = signature.substr(PRIVATE_KEY_PREFIX.length + 1);
        if (withoutPrefix.indexOf(publicKey) === -1) {
            return false;
        }

        const withoutPublicKey = withoutPrefix.substr(publicKey.length + 1);
        if (signedData !== withoutPublicKey) {
            return false;
        }

        return true;
    }

    getMyPublicKey(): string {
        return this.myPublicKey;
    }

}