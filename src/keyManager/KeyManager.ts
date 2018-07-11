export interface KeyManager {
    sign(object: any): string;
    verify(object: any, signature: string, publicKeyName: string): boolean;
}