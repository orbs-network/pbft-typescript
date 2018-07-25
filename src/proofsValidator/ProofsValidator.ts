import { KeyManager } from "../keyManager/KeyManager";
import { PreparedProof } from "../storage/PBFTStorage";
import { calculateBlockHash } from "../../test/blockUtils/BlockUtilsMock";
import { BlockUtils } from "../blockUtils/BlockUtils";

export function validatePrepared(
    preparedProof: PreparedProof,
    f: number,
    keyManager: KeyManager,
    blockUtils: BlockUtils,
    calcLeaderPk: (view: number) => string): boolean {
    const { preparePayloads, prepreparePayload } = preparedProof;
    if (!preparePayloads || !prepreparePayload) {
        return false;
    }

    if (preparePayloads.length < 2 * f) {
        return false;
    }

    const { block, pk: leaderPk } = prepreparePayload;
    const { view, term, blockHash } = prepreparePayload.data;

    if (calcLeaderPk(view) !== leaderPk) {
        return false;
    }

const allPreparesPkAreUnique = preparePayloads.reduce((prev, current) => prev.set(current.pk, true), new Map()).size === preparePayloads.length;
    if (!allPreparesPkAreUnique) {
        return false;
    }

    const isPrepareMisMatch = preparePayloads
        .map(p => p.data)
        .findIndex(p => p.view !== view || p.term !== term || p.blockHash !== blockHash) > -1;

    if (isPrepareMisMatch) {
        return false;
    }

    const isValidDigest = blockUtils.calculateBlockHash(block).equals(blockHash);
    if (!isValidDigest) {
        return false;
    }

    return true;
}