import { Payload } from "../../src/networkCommunication/Payload";

export function buildPayload(data: any): Payload {
    return {
        pk: "pk",
        signature: "signature",
        data
    };
}