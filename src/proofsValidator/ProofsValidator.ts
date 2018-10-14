import { KeyManager } from "../keyManager/KeyManager";
import { PreparedProof } from "../networkCommunication/Messages";

export function validatePreparedProof(
    targetBlockHeight: number,
    targetView: number,
    preparedProof: PreparedProof,
    f: number,
    keyManager: KeyManager,
    membersPKs: string[],
    calcLeaderPk: (view: number) => string): boolean {

    if (!preparedProof) {
        return true;
    }

    const { preprepareSender, prepareSenders, preprepareBlockRef, prepareBlockRef } = preparedProof;
    if (!prepareBlockRef || !preprepareBlockRef || !preprepareSender || !prepareSenders) {
        return false;
    }

    const { blockHeight, view } = preprepareBlockRef;
    if (blockHeight !== targetBlockHeight) {
        return false;
    }

    if (view >= targetView) {
        return false;
    }

    if (prepareSenders.length < 2 * f) {
        return false;
    }

    if (keyManager.verifyBlockRef(preprepareBlockRef, preprepareSender) === false) {
        return false;
    }

    const leaderPk = preprepareSender.senderPublicKey;
    if (calcLeaderPk(view) !== leaderPk) {
        return false;
    }

    const allPreparesPkAreUnique = prepareSenders.reduce((prev, current) => prev.set(current.senderPublicKey, true), new Map()).size === prepareSenders.length;
    if (!allPreparesPkAreUnique) {
        return false;
    }

    const allPreparesPKsAreMembers = prepareSenders.every(p => membersPKs.indexOf(p.senderPublicKey) > -1);
    if (allPreparesPKsAreMembers == false) {
        return false;
    }

    const allPrepraresAreNotLeaders = prepareSenders.every(p => p.senderPublicKey !== leaderPk);
    if (allPrepraresAreNotLeaders === false) {
        return false;
    }

    if (prepareSenders.every(sender => keyManager.verifyBlockRef(prepareBlockRef, sender)) === false) {
        return false;
    }

    const isPrepareMatch =
        preprepareBlockRef.view === prepareBlockRef.view &&
        preprepareBlockRef.blockHeight === prepareBlockRef.blockHeight &&
        preprepareBlockRef.blockHash.equals(prepareBlockRef.blockHash);

    return isPrepareMatch;
}