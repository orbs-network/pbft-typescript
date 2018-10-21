import { KeyManager } from "../keyManager/KeyManager";
import { PreparedProof } from "../networkCommunication/Messages";

export function validatePreparedProof(
    targetBlockHeight: number,
    targetView: number,
    preparedProof: PreparedProof,
    q: number,
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

    if (prepareSenders.length < q - 1) {
        return false;
    }

    const signedPreprepareBlockRef = JSON.stringify(preprepareBlockRef);
    if (keyManager.verify(signedPreprepareBlockRef, preprepareSender) === false) {
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

    const signedPrepareBlockRef = JSON.stringify(prepareBlockRef);
    if (prepareSenders.every(sender => keyManager.verify(signedPrepareBlockRef, sender)) === false) {
        return false;
    }

    const isPrepareMatch =
        preprepareBlockRef.view === prepareBlockRef.view &&
        preprepareBlockRef.blockHeight === prepareBlockRef.blockHeight &&
        preprepareBlockRef.blockHash.equals(prepareBlockRef.blockHash);

    return isPrepareMatch;
}