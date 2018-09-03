import { Block, KeyManager } from "../../src";
import { BlockRefMessage, CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, ViewChangeVote } from "../../src/networkCommunication/Messages";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

export function blockRefMessageFromPP(preprepareMessage: PrePrepareMessage): BlockRefMessage {
    return { signaturePair: preprepareMessage.signaturePair, content: preprepareMessage.content };
}

export function aPrePrepareMessage(keyManager: KeyManager, term: number, view: number, block: Block): PrePrepareMessage {
    const mf: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);
    return mf.createPreprepareMessage(term, view, block);
}

export function aPrepareMessage(keyManager: KeyManager, term: number, view: number, block: Block): PrepareMessage {
    const blockHash: Buffer = calculateBlockHash(block);
    const mf: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);
    return mf.createPrepareMessage(term, view, blockHash);
}

export function aCommitMessage(keyManager: KeyManager, term: number, view: number, block: Block): CommitMessage {
    const blockHash: Buffer = calculateBlockHash(block);
    const mf: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);
    return mf.createCommitMessage(term, view, blockHash);
}

export function aViewChangeMessage(keyManager: KeyManager, term: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage {
    const mf: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);
    return mf.createViewChangeMessage(term, view, preparedMessages);
}

export function aNewViewMessage(keyManager: KeyManager, term: number, view: number, preprepareMessage: PrePrepareMessage, votes: ViewChangeVote[]): NewViewMessage {
    const mf: MessagesFactory = new MessagesFactory(calculateBlockHash, keyManager);
    return mf.createNewViewMessage(term, view, preprepareMessage, votes);
}
