import { Payload } from "../../src/networkCommunication/Payload";

export function buildPayload(senderPk: string, data: any): Payload {
    return {
        pk: senderPk,
        signature: "signature",
        data
    };
}