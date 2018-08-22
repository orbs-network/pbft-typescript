import { Block } from "..";
import { BlockUtils } from "../blockUtils/BlockUtils";
import { KeyManager } from "../keyManager/KeyManager";
import { PreparedProof, BlockMessageContent, MessageType } from "../networkCommunication/Messages";

export function validatePreparedProof(
    targetTerm: number,
    targetView: number,
    preparedProof: PreparedProof,
    block: Block,
    f: number,
    keyManager: KeyManager,
    blockUtils: BlockUtils,
    membersPKs: string[],
    calcLeaderPk: (view: number) => string): boolean {

    if (!preparedProof) {
        return true;
    }

    if (!block) {
        return false;
    }

    const { prepareMessagesSignatures, preprepareMessageSignature, view, term, blockHash } = preparedProof;
    if (!prepareMessagesSignatures || !preprepareMessageSignature) {
        return false;
    }

    if (term !== targetTerm) {
        return false;
    }

    if (view >= targetView) {
        return false;
    }

    if (prepareMessagesSignatures.length < 2 * f) {
        return false;
    }

    const { signerPublicKey: leaderPk, contentSignature } = preprepareMessageSignature;
    const expectedPrePrepareMessageContent: BlockMessageContent = { messageType: MessageType.PREPREPARE, term, view, blockHash };
    if (keyManager.verify(expectedPrePrepareMessageContent, contentSignature, leaderPk) === false) {
        return false;
    }

    if (calcLeaderPk(view) !== leaderPk) {
        return false;
    }

    const allPreparesPkAreUnique = prepareMessagesSignatures.reduce((prev, current) => prev.set(current.signerPublicKey, true), new Map()).size === prepareMessagesSignatures.length;
    if (!allPreparesPkAreUnique) {
        return false;
    }

    const allPreparesPKsAreMembers = prepareMessagesSignatures.every(p => membersPKs.indexOf(p.signerPublicKey) > -1);
    if (allPreparesPKsAreMembers == false) {
        return false;
    }

    const allPrepraresAreNotLeaders = prepareMessagesSignatures.every(p => p.signerPublicKey !== leaderPk);
    if (allPrepraresAreNotLeaders === false) {
        return false;
    }

    const expectedPrepareMessageContent: BlockMessageContent = { messageType: MessageType.PREPARE, term, view, blockHash };
    if (prepareMessagesSignatures.every(p => keyManager.verify(expectedPrepareMessageContent, p.contentSignature, p.signerPublicKey)) === false) {
        return false;
    }

    const isValidDigest = blockUtils.calculateBlockHash(block).equals(blockHash);
    if (!isValidDigest) {
        return false;
    }

    return true;
}