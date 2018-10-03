import { Block } from "../Block";
import { SenderSignature, ViewChangeMessage, MessageType, NewViewMessage } from "./Messages";

const BLOCK: Block = undefined;
const BLOCK_HASH: Buffer = undefined;
const VC_SIGNATURE1: SenderSignature = undefined;
const VC_SIGNATURE2: SenderSignature = undefined;
const VC_SIGNATURE3: SenderSignature = undefined;
const PP_SIGNATURE: SenderSignature = undefined;
const P_SIGNATURE1: SenderSignature = undefined;
const P_SIGNATURE2: SenderSignature = undefined;

const NV_SIGNATURE: SenderSignature = undefined;
const NV_TERM = 0;
const NV_VIEW = 1;
const PREPARED_VIEW = 0; // < NV_VIEW

const exampleNewViewMessage: NewViewMessage = {
    signedHeader: {
        messageType: MessageType.NEW_VIEW,
        term: NV_TERM,
        view: NV_VIEW,
        viewChangeConfirmations: [
            {
                signedHeader: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: {
                        preprepareBlockRefMessage: {
                            signedHeader: {
                                messageType: MessageType.PREPREPARE,
                                term: NV_TERM,
                                view: PREPARED_VIEW,
                                blockHash: BLOCK_HASH
                            },
                            sender: PP_SIGNATURE
                        },
                        prepareBlockRefMessages: [
                            {
                                signedHeader: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                sender: P_SIGNATURE1
                            },
                            {
                                signedHeader: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                sender: P_SIGNATURE2
                            },
                        ]
                    }
                },
                sender: VC_SIGNATURE1
            },
            {
                signedHeader: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: {
                        preprepareBlockRefMessage: {
                            signedHeader: {
                                messageType: MessageType.PREPREPARE,
                                term: NV_TERM,
                                view: PREPARED_VIEW,
                                blockHash: BLOCK_HASH
                            },
                            sender: PP_SIGNATURE
                        },
                        prepareBlockRefMessages: [
                            {
                                signedHeader: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                sender: P_SIGNATURE1
                            },
                            {
                                signedHeader: {
                                    messageType: MessageType.PREPARE,
                                    term: NV_TERM,
                                    view: PREPARED_VIEW,
                                    blockHash: BLOCK_HASH
                                },
                                sender: P_SIGNATURE2
                            },
                        ]
                    }
                },
                sender: VC_SIGNATURE2
            },
            {
                signedHeader: {
                    messageType: MessageType.VIEW_CHANGE,
                    term: NV_TERM,
                    view: NV_VIEW,
                    preparedProof: undefined
                },
                sender: VC_SIGNATURE3
            },
        ]
    },
    sender: NV_SIGNATURE,
    preprepareMessage: {
        signedHeader: {
            messageType: MessageType.PREPREPARE,
            term: NV_TERM,
            view: NV_VIEW,
            blockHash: BLOCK_HASH
        },
        sender: PP_SIGNATURE,
        block: BLOCK
    }
};

