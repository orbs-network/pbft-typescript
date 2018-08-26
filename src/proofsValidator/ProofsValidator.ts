import { KeyManager } from "../keyManager/KeyManager";
import { PreparedProof } from "../networkCommunication/Messages";

export function validatePreparedProof(
    targetTerm: number,
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

    const { term, view, blockHash } = preprepareBlockRefMessage.content;
    if (term !== targetTerm) {
        return false;
    }

    if (view >= targetView) {
        return false;
    }

    if (prepareBlockRefMessages.length < 2 * f) {
        return false;
    }

    const { content: expectedPrePrepareMessageContent, signaturePair } = preprepareBlockRefMessage;
    const { signerPublicKey: leaderPk, contentSignature } = signaturePair;
    if (keyManager.verify(expectedPrePrepareMessageContent, contentSignature, leaderPk) === false) {
        return false;
    }

    if (calcLeaderPk(view) !== leaderPk) {
        return false;
    }

    const allPreparesPkAreUnique = prepareBlockRefMessages.reduce((prev, current) => prev.set(current.signaturePair.signerPublicKey, true), new Map()).size === prepareBlockRefMessages.length;
    if (!allPreparesPkAreUnique) {
        return false;
    }

    const allPreparesPKsAreMembers = prepareBlockRefMessages.every(p => membersPKs.indexOf(p.signaturePair.signerPublicKey) > -1);
    if (allPreparesPKsAreMembers == false) {
        return false;
    }

    const allPrepraresAreNotLeaders = prepareBlockRefMessages.every(p => p.signaturePair.signerPublicKey !== leaderPk);
    if (allPrepraresAreNotLeaders === false) {
        return false;
    }

    if (prepareBlockRefMessages.every(p => keyManager.verify(p.content, p.signaturePair.contentSignature, p.signaturePair.signerPublicKey)) === false) {
        return false;
    }

    const isPrepareMisMatch = prepareBlockRefMessages
        .map(p => p.content)
        .findIndex(p => p.view !== view || p.term !== term || !p.blockHash.equals(blockHash)) > -1;

    if (isPrepareMisMatch) {
        return false;
    }

    // const isValidDigest = blockUtils.calculateBlockHash(block).equals(blockHash);
    // if (!isValidDigest) {
    //     return false;
    // }

    return true;
}