import { Payload, PrePreparePayload, PreparePayload, CommitPayload, ViewChangePayload, NewViewPayload, PayloadData, PrePreparePayloadData, PreparePayloadData, CommitPayloadData, NewViewPayloadData, ViewChangePayloadData } from "../../src/networkCommunication/Payload";
import { Block, KeyManager } from "../../src";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { PreparedProof } from "../../src/storage/PBFTStorage";

export function aPrePreparePayload(keyManager: KeyManager, term: number, view: number, block: Block): PrePreparePayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const data: PrePreparePayloadData = { messageType: "preprepare", term, view, blockHash };
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data,
        block
    };
}

export function aPreparePayload(keyManager: KeyManager, term: number, view: number, block: Block): PreparePayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const data: PreparePayloadData = { messageType: "prepare", term, view, blockHash };
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aCommitPayload(keyManager: KeyManager, term: number, view: number, block: Block): CommitPayload {
    const blockHash: Buffer = calculateBlockHash(block);
    const data: CommitPayloadData = { messageType: "commit", term, view, blockHash };
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aViewChangePayload(keyManager: KeyManager, term: number, newView: number, preparedProof?: PreparedProof): ViewChangePayload {
    const data: ViewChangePayloadData = { messageType: "view-change", term, newView, preparedProof };
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}

export function aNewViewPayload(keyManager: KeyManager, term: number, view: number, PP: PrePreparePayload, VCProof: ViewChangePayload[]): NewViewPayload {
    const data: NewViewPayloadData = { messageType: "new-view", term, view, PP, VCProof };
    return {
        pk: keyManager.getMyPublicKey(),
        signature: keyManager.sign(data),
        data
    };
}
