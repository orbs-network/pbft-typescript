import { Payload } from "../../src/networkCommunication/Payload";

export function aPayload(senderPk: string, data: any): Payload {
    return {
        pk: senderPk,
        signature: "signature",
        data
    };
}