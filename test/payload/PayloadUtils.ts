import { Payload } from "../../src/gossip/Payload";

export function buildPayload(data: any): Payload {
    return {
        pk: "pk",
        signature: "signature",
        data: data
    };
}