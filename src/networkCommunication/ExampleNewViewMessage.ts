import { Block } from "../Block";
import { SignaturePair, ViewChangeMessage, MessageType, NewViewMessage } from "./Messages";

const BLOCK: Block = undefined;
const BLOCK_HASH: Buffer = undefined;
const VC_SIGNATURE1: SignaturePair = undefined;
const VC_SIGNATURE2: SignaturePair = undefined;
const VC_SIGNATURE3: SignaturePair = undefined;
const PP_SIGNATURE: SignaturePair = undefined;
const P_SIGNATURE1: SignaturePair = undefined;
const P_SIGNATURE2: SignaturePair = undefined;

const NV_SIGNATURE: SignaturePair = undefined;
const NV_TERM = 0;
const NV_VIEW = 1;
const PREPARED_VIEW = 0; // < NV_VIEW

const exampleNewViewMessage: NewViewMessage = {
    content: {
        messageType: MessageType.NEW_VIEW,
        term: NV_TERM,
        view: NV_VIEW,
        votes: [
            {
                content: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: {
                        preprepareBlockRefMessage: {
                            content: {
                                messageType: MessageType.PREPREPARE,
                                term: NV_TERM,
                                view: PREPARED_VIEW,
                                blockHash: BLOCK_HASH
                            },
                            signaturePair: PP_SIGNATURE
                        },
                        prepareBlockRefMessages: [
                            {
                                content: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                signaturePair: P_SIGNATURE1
                            },
                            {
                                content: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                signaturePair: P_SIGNATURE2
                            },
                        ]
                    }
                },
                signaturePair: VC_SIGNATURE1
            },
            {
                content: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: {
                        preprepareBlockRefMessage: {
                            content: {
                                messageType: MessageType.PREPREPARE,
                                term: NV_TERM,
                                view: PREPARED_VIEW,
                                blockHash: BLOCK_HASH
                            },
                            signaturePair: PP_SIGNATURE
                        },
                        prepareBlockRefMessages: [
                            {
                                content: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                signaturePair: P_SIGNATURE1
                            },
                            {
                                content: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                signaturePair: P_SIGNATURE2
                            },
                        ]
                    }
                },
                signaturePair: VC_SIGNATURE2
            },
            {
                content: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: undefined
                },
                signaturePair: VC_SIGNATURE3
            },
        ]
    },
    signaturePair: NV_SIGNATURE,
    preprepareMessage: {
        content: {
            messageType: MessageType.PREPREPARE,
            term: NV_TERM,
            view: NV_VIEW,
            blockHash: BLOCK_HASH
        },
        signaturePair: PP_SIGNATURE,
        block: BLOCK
    }
};

