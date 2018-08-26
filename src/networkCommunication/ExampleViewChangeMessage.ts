import { Block } from "../Block";
import { SignaturePair, ViewChangeMessage, MessageType, NewViewMessage } from "./Messages";

const VC_TERM = 0;
const VC_VIEW = 1;
const PREPARED_VIEW = 0; // < VC_VIEW;
const BLOCK: Block = undefined;
const BLOCK_HASH: Buffer = undefined;
const VC_SIGNATURE: SignaturePair = undefined;
const PP_SIGNATURE: SignaturePair = undefined;
const P_SIGNATURE1: SignaturePair = undefined;
const P_SIGNATURE2: SignaturePair = undefined;

const exampleViewChangeMessage: ViewChangeMessage = {
    content: {
        messageType: MessageType.VIEW_CHANGE,
        term: VC_TERM,
        view: VC_VIEW,
        preparedProof: {
            preprepareBlockRefMessage: {
                content: {
                    messageType: MessageType.PREPREPARE,
                    term: VC_TERM,
                    view: PREPARED_VIEW,
                    blockHash: BLOCK_HASH
                },
                signaturePair: PP_SIGNATURE
            },
            prepareBlockRefMessages: [
                {
                    content: {
                        messageType: MessageType.PREPARE,
                        term: VC_TERM,
                        view: PREPARED_VIEW,
                        blockHash: BLOCK_HASH
                    },
                    signaturePair: P_SIGNATURE1
                },
                {
                    content: {
                        messageType: MessageType.PREPARE,
                        term: VC_TERM,
                        view: PREPARED_VIEW,
                        blockHash: BLOCK_HASH
                    },
                    signaturePair: P_SIGNATURE2
                },
            ]
        }
    },
    signaturePair: VC_SIGNATURE,
    block: BLOCK
};
