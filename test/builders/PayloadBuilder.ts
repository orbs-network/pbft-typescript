import { Payload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { Block, KeyManager } from "../../src";

export function aPayload(keyManager: KeyManager, data: any): Payload {
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aPrePreparePayload(keyManager: KeyManager, data: any, block: Block): PrePreparePayload {
    const payload = aPayload(keyManager, data);
    return {...payload, block};
}