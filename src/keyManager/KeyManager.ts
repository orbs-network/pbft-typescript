export interface KeyManager {
    sign(object: any): string;
    verify(object: any, signature: string, publicKey: string): boolean;
    getMyPublicKey(): string;
}