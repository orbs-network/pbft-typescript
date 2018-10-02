import { Block } from "../Block";
import { SenderSignature, ViewChangeMessage, MessageType, NewViewMessage } from "./Messages";

const VC_TERM = 0;
const VC_VIEW = 1;
const PREPARED_VIEW = 0; // < VC_VIEW;
const BLOCK: Block = undefined;
const BLOCK_HASH: Buffer = undefined;
const VC_SIGNATURE: SenderSignature = undefined;
const PP_SIGNATURE: SenderSignature = undefined;
const P_SIGNATURE1: SenderSignature = undefined;
const P_SIGNATURE2: SenderSignature = undefined;

const exampleViewChangeMessage: ViewChangeMessage = {
    signedHeader: {
        messageType: MessageType.VIEW_CHANGE,
        term: VC_TERM,
        view: VC_VIEW,
        preparedProof: {
            preprepareBlockRefMessage: {
                signedHeader: {
                    messageType: MessageType.PREPREPARE,
                    term: VC_TERM,
                    view: PREPARED_VIEW,
                    blockHash: BLOCK_HASH
                },
                signer: PP_SIGNATURE
            },
            prepareBlockRefMessages: [
                {
                    signedHeader: {
                        messageType: MessageType.PREPARE,
                        term: VC_TERM,
                        view: PREPARED_VIEW,
                        blockHash: BLOCK_HASH
                    },
                    signer: P_SIGNATURE1
                },
                {
                    signedHeader: {
                        messageType: MessageType.PREPARE,
                        term: VC_TERM,
                        view: PREPARED_VIEW,
                        blockHash: BLOCK_HASH
                    },
                    signer: P_SIGNATURE2
                },
            ]
        }
    },
    signer: VC_SIGNATURE,
    block: BLOCK
};
