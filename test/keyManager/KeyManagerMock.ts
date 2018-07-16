import { KeyManager } from "../../src/keyManager/KeyManager";

export class KeyManagerMock implements KeyManager {
    constructor(private myPublicKey: string) {

    }

    sign(object: any): string {
        return "";
    }

    verify(object: any, signature: string, publicKey: string): boolean {
        return false;
    }

    getMyPublicKey(): string {
        return this.myPublicKey;
    }

}