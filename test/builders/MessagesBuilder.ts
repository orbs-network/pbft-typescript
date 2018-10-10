import { Block, KeyManager } from "../../src";
import { BlockRefMessage, CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeConfirmation, ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";
import { MessagesFactoryMock } from "../networkCommunication/MessagesFactoryMock";
import { PreparedMessages } from "../../src/storage/PreparedMessagesExtractor";

export function blockRefMessageFromPP(preprepareMessage: PrePrepareMessage): BlockRefMessage {
    return { sender: preprepareMessage.sender, signedHeader: preprepareMessage.signedHeader };
}

export function aPrePrepareMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): PrePrepareMessage {
    const mf: MessagesFactory = new MessagesFactoryMock(keyManager);
    return mf.createPreprepareMessage(blockHeight, view, block);
}

export function aPrepareMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): PrepareMessage {
    const mf: MessagesFactory = new MessagesFactoryMock(keyManager);
    return mf.createPrepareMessage(blockHeight, view, block.getBlockHash());
}

export function aCommitMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): CommitMessage {
    const mf: MessagesFactory = new MessagesFactoryMock(keyManager);
    return mf.createCommitMessage(blockHeight, view, block.getBlockHash());
}

export function aViewChangeMessage(keyManager: KeyManager, blockHeight: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage {
    const mf: MessagesFactory = new MessagesFactoryMock(keyManager);
    return mf.createViewChangeMessage(blockHeight, view, preparedMessages);
}

export function aNewViewMessage(keyManager: KeyManager, blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, votes: ViewChangeConfirmation[]): NewViewMessage {
    const mf: MessagesFactory = new MessagesFactoryMock(keyManager);
    return mf.createNewViewMessage(blockHeight, view, preprepareMessage, votes);
}
