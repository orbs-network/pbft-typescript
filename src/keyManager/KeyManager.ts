export interface KeyManager {
    sign(data: string): string;
    verify(signedData: string, publicKey: string, signature: string): boolean;

    getMyPublicKey(): string;
}