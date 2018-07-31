import { Payload, PrePreparePayload } from "../../src/networkCommunication/Payload";
import { Block, KeyManager } from "../../src";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

export function aPayload(keyManager: KeyManager, data: any): Payload {
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aPrePreparePayload(keyManager: KeyManager, term: number, view: number, block: Block): PrePreparePayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const payload = aPayload(keyManager, { term, view, blockHash });
    return { ...payload, block };
}
