import { Payload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { Block } from "../../src";

export function aPayload(senderPk: string, data: any): Payload {
    return {
        pk: senderPk,
        signature: "signature",
        data
    };
}

export function aPrePreparePayload(senderPk: string, data: any, block: Block): PrePreparePayload {
    const payload = aPayload(senderPk, data);
    return {...payload, block};
}