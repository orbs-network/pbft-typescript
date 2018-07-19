import { KeyManager } from "../../src/keyManager/KeyManager";

const PRIVATE_KEY_PREFIX = "PRIVATE_KEY";

export class KeyManagerMock implements KeyManager {

    constructor(private myPublicKey: string) {
    }

    sign(object: any): string {
        return `${PRIVATE_KEY_PREFIX}-${this.myPublicKey}-${JSON.stringify(object)}`;
    }

    verify(object: any, signature: string, publicKey: string): boolean {
        if (signature.indexOf(PRIVATE_KEY_PREFIX) === -1) {
            return false;
        }

        const withoutPrefix = signature.substr(PRIVATE_KEY_PREFIX.length + 1);
        if (withoutPrefix.indexOf(publicKey) === -1) {
            return false;
        }

        const withoutPublicKey = withoutPrefix.substr(publicKey.length + 1);
        if (JSON.stringify(object) !== withoutPublicKey) {
            return false;
        }

        return true;
    }

    getMyPublicKey(): string {
        return this.myPublicKey;
    }

}