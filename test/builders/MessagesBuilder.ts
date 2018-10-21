import { Block, KeyManager } from "../../src";
import { BlockRefContent, CommitMessage, NewViewMessage, PrepareMessage, PrePrepareMessage, ViewChangeMessage, ViewChangeContent } from "../../src/networkCommunication/Messages";
import { PreparedMessages } from "../../src/storage/PreparedMessagesExtractor";
import { MessagesFactory } from "../../src/networkCommunication/MessagesFactory";

export function blockRefMessageFromPP(preprepareMessage: PrePrepareMessage): BlockRefContent {
    return { sender: preprepareMessage.content.sender, signedHeader: preprepareMessage.content.signedHeader };
}

export function aPrePrepareMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): PrePrepareMessage {
    const mf: MessagesFactory = new MessagesFactory(keyManager);
    return mf.createPreprepareMessage(blockHeight, view, block);
}

export function aPrepareMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): PrepareMessage {
    const mf: MessagesFactory = new MessagesFactory(keyManager);
    return mf.createPrepareMessage(blockHeight, view, block.getBlockHash());
}

export function aCommitMessage(keyManager: KeyManager, blockHeight: number, view: number, block: Block): CommitMessage {
    const mf: MessagesFactory = new MessagesFactory(keyManager);
    return mf.createCommitMessage(blockHeight, view, block.getBlockHash());
}

export function aViewChangeMessage(keyManager: KeyManager, blockHeight: number, view: number, preparedMessages?: PreparedMessages): ViewChangeMessage {
    const mf: MessagesFactory = new MessagesFactory(keyManager);
    return mf.createViewChangeMessage(blockHeight, view, preparedMessages);
}

export function aNewViewMessage(keyManager: KeyManager, blockHeight: number, view: number, preprepareMessage: PrePrepareMessage, viewChangeMessages: ViewChangeMessage[]): NewViewMessage {
    const mf: MessagesFactory = new MessagesFactory(keyManager);
    const votes: ViewChangeContent[] = viewChangeMessages.map(vc => vc.content);
    return mf.createNewViewMessage(blockHeight, view, preprepareMessage, votes);
}
