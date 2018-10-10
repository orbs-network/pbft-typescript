import { PBFTStorage } from "./PBFTStorage";
import { PrePrepareMessage, PrepareMessage } from "../networkCommunication/Messages";

export interface PreparedMessages {
    preprepareMessage: PrePrepareMessage;
    prepareMessages: PrepareMessage[];
}

export function extractPreparedMessages(blockHeight: number, pbftStorage: PBFTStorage, f: number): PreparedMessages {
    const preprepareMessage: PrePrepareMessage = pbftStorage.getLatestPrePrepare(blockHeight);
    if (preprepareMessage) {
        const lastView = preprepareMessage.signedHeader.view;
        const prepareMessages: PrepareMessage[] = pbftStorage.getPrepareMessages(blockHeight, lastView, preprepareMessage.signedHeader.blockHash);
        if (prepareMessages.length >= f * 2) {
            return { preprepareMessage, prepareMessages };
        }
    }
}