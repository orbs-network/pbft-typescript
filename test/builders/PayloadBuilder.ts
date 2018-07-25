import { Payload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { Block, KeyManager } from "../../src";

export function aPayload(senderPk: string, data: any): Payload {
    return {
        pk: senderPk,
        signature: "signature",
        data
    };
}

export function aPrePreparePayload(keyManager: KeyManager, data: any, block: Block): PrePreparePayload {
    const payload = aPayload(keyManager.getMyPublicKey(), data);
    return {...payload, block};
}