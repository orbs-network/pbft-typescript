import { Block } from "../Block";
import { ViewChangeMessage } from "../networkCommunication/Messages";

export function getLatestBlockFromViewChangeMessages(messages: ViewChangeMessage[]): Block {
    const filteredProofs = messages
        .filter(msg => msg.block !== undefined)
        .filter(msg => msg.content !== undefined)
        .filter(msg => msg.content.preparedProof !== undefined)
        .sort((a, b) => b.content.preparedProof.preprepareBlockRefMessage.content.view - a.content.preparedProof.preprepareBlockRefMessage.content.view);

    if (filteredProofs.length > 0) {
        return filteredProofs[0].block;
    } else {
        return undefined;
    }
}