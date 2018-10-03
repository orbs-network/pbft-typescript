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

    const { prepareBlockRefMessages, preprepareBlockRefMessage } = preparedProof;
    if (!prepareBlockRefMessages || !preprepareBlockRefMessage) {
        return false;
    }

    const { blockHeight, view, blockHash } = preprepareBlockRefMessage.signedHeader;
    if (blockHeight !== targetBlockHeight) {
        return false;
    }

    if (view >= targetView) {
        return false;
    }

    if (prepareBlockRefMessages.length < 2 * f) {
        return false;
    }

    const { signedHeader: expectedPrePrepareMessageContent, sender } = preprepareBlockRefMessage;
    if (keyManager.verifyBlockRef(expectedPrePrepareMessageContent, sender) === false) {
        return false;
    }

    const leaderPk = sender.senderPublicKey;
    if (calcLeaderPk(view) !== leaderPk) {
        return false;
    }

    const allPreparesPkAreUnique = prepareBlockRefMessages.reduce((prev, current) => prev.set(current.sender.senderPublicKey, true), new Map()).size === prepareBlockRefMessages.length;
    if (!allPreparesPkAreUnique) {
        return false;
    }

    const allPreparesPKsAreMembers = prepareBlockRefMessages.every(p => membersPKs.indexOf(p.sender.senderPublicKey) > -1);
    if (allPreparesPKsAreMembers == false) {
        return false;
    }

    const allPrepraresAreNotLeaders = prepareBlockRefMessages.every(p => p.sender.senderPublicKey !== leaderPk);
    if (allPrepraresAreNotLeaders === false) {
        return false;
    }

    if (prepareBlockRefMessages.every(p => keyManager.verifyBlockRef(p.signedHeader, p.sender)) === false) {
        return false;
    }

    const isPrepareMisMatch = prepareBlockRefMessages
        .map(p => p.signedHeader)
        .findIndex(p => p.view !== view || p.blockHeight !== blockHeight || !p.blockHash.equals(blockHash)) > -1;

    if (isPrepareMisMatch) {
        return false;
    }

    return true;
}