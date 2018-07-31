import { Payload, PrePreparePayload, PreparePayload } from "../../src/networkCommunication/Payload";
import { Block, KeyManager } from "../../src";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

export function aPayload(keyManager: KeyManager, data: any): Payload {
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aPreparePayload(keyManager: KeyManager, term: number, view: number, block: Block): PreparePayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const payload = aPayload(keyManager, { term, view, blockHash });
    return { ...payload };
}

export function aPrePreparePayload(keyManager: KeyManager, term: number, view: number, block: Block): PrePreparePayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const payload = aPayload(keyManager, { term, view, blockHash });
    return { ...payload, block };
}
