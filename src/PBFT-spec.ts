function primary(view: number): string { return ""; }
function constructBlock(): Block { return { previousBlockHash: "", height: 0 }; }
function HASH(block): string { return ""; }
function getPrepareCount(term: number, view: number, blockHash: string): number { return 0; }
function getCommitCount(term: number, view: number): any { return 0; }
function getViewChangeCount(term: number, view: number): any { return 0; }
function Multicast(senderPublicKey: string, message: string, payload): void { }
function Unicast(senderPublicKey: string, targetPublicKey: string, message, payload): void { }
function valid(block: Block): boolean { return true; }
function sign(privateKey: string, content: any): string { return ""; }

function LogPP(term: number, view: number, message: "PRE-PREPARE", { pk: string, data: PPMessage }) { }
function LogP(term: number, view: number, message: "PREPARE", { pk: string, data: PMessage }) { }
function LogC(term: number, view: number, message: "COMMIT", { pk: string, data: CMessage }) { }
function LogVC(term: number, view: number, message: "VIEW-CHANGE", { pk: string, data: VCMessage }) { }
function LogNV(term: number, view: number, message: "NEW-VIEW", { pk: string, data: NVMessage }) { }

function fetchFromLogPP(term: number, view: number, message: "PRE-PREPARE"): { pk: string, data: PPMessage } { return undefined; }
function fetchFromLogP(term: number, view: number, message: "PREPARE"): { pk: string, data: PMessage }[] { return undefined; }
function fetchFromLogC(term: number, view: number, message: "COMMIT"): { pk: string, data: CMessage }[] { return undefined; }
function fetchFromLogVC(term: number, view: number, message: "VIEW-CHANGE"): { pk: string, data: VCMessage }[] { return undefined; }
function fetchFromLogNV(term: number, view: number, message: "NEW-VIEW"): { pk: string, data: NVMessage }[] { return undefined; }

function signPP(privateKey: string, content: PPPayload): DigestTypes.PP { return DigestTypes.PP; }
function signP(privateKey: string, content: PPayload): DigestTypes.P { return DigestTypes.P; }
function signC(privateKey: string, content: CPayload): DigestTypes.C { return DigestTypes.C; }
function signVC(privateKey: string, content: VCPayload): DigestTypes.VC { return DigestTypes.VC; }
function signNV(privateKey: string, content: NVPayload): DigestTypes.NV { return DigestTypes.NV; }

function decryptPP(publicKey: string, encryptedData: DigestTypes.PP): PPPayload { return undefined; }
function decryptP(publicKey: string, encryptedData: DigestTypes.P): PPayload { return undefined; }
function decryptC(publicKey: string, encryptedData: DigestTypes.C): CPayload { return undefined; }
function decryptVC(publicKey: string, encryptedData: DigestTypes.VC): VCPayload { return undefined; }
function decryptNV(publicKey: string, encryptedData: DigestTypes.NV): NVPayload { return undefined; }

type Block = {
    height: number;
    previousBlockHash: string;
};

enum DigestTypes { PP, P, C, VC, NV }

type PPMessage = {
    payload: DigestTypes.PP;
    CB: Block;
};

type PMessage = {
    payload: DigestTypes.P;
};

type CMessage = {
    payload: DigestTypes.C;
};

type VCMessage = {
    payload: DigestTypes.VC;
};

type NVMessage = {
    payload: DigestTypes.NV;
};

type PPPayload = {
    message: "PRE-PREPARE",
    view: number,
    term: number,
    blockHash: string
};

type PPayload = {
    message: "PREPARE",
    view: number,
    term: number,
    blockHash: string
};

type CPayload = {
    message: "COMMIT",
    view: number,
    term: number,
    blockHash: string
};

type VCPayload = {
    message: "VIEW-CHANGE"
    view: number,
    term: number,
    preparedProof: PreparedProof
};

type NVPayload = {
    message: "NEW-VIEW",
    newViewProof,
    PP: PPMessage
};

type PreparedProof = {
    preprepare: { pk: string, data: PPMessage },
    prepares: { pk: string, data: PMessage }[]
};

class PBFT {
    private myPublicKey: string;
    private myPrivateKey: string;
    private lastCommittedBlock: Block;
    private timer;
    private term: number;
    private view: number;
    private CB: Block;
    private preparedProof: PreparedProof;

    constructor(private config: { f: number, TIMEOUT: number }) {
        this.initPBFT();
    }

    initPBFT() {
        this.term = this.lastCommittedBlock.height;
        this.initView(0);
        this.preparedProof = undefined;
    }

    initView(view: number) {
        this.view = view;
        this.CB = undefined;
        this.startTimer();
        if (primary(this.view) === this.myPublicKey) {
            this.CB = constructBlock();
            const PP: PPMessage = {
                payload: signPP(this.myPrivateKey, {
                    message: "PRE-PREPARE",
                    view: this.view,
                    term: this.term,
                    blockHash: HASH(this.CB),
                }),
                CB: this.CB
            };
            LogPP(this.term, this.view, "PRE-PREPARE", { pk: this.myPublicKey, data: PP });
            Multicast(this.myPublicKey, "PRE-PREPARE", PP);
        }
    }

    startTimer() {
        this.timer(this.config.TIMEOUT * 2 ^ this.view);
    }

    onReceivePrePrepare(senderPublicKey: string, PP: PPMessage) {
        const { message, view, term, blockHash } = decryptPP(senderPublicKey, PP.payload);
        const B = PP.CB;

        if (message === "PRE-PREPARE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view === this.view &&
                    term === this.term &&
                    primary(view) === senderPublicKey &&
                    blockHash === HASH(B) &&
                    B.previousBlockHash === HASH(this.lastCommittedBlock) &&
                    valid(B) &&
                    this.isPrePrepared(term, view, blockHash) === false) {

                    this.CB = B;
                    const P: PMessage = {
                        payload: signP(this.myPrivateKey, {
                            message: "PREPARE",
                            view,
                            term,
                            blockHash,
                        })
                    };
                    LogP(term, view, "PREPARE", { pk: senderPublicKey, data: P });
                    LogPP(term, view, "PRE-PREPARE", { pk: senderPublicKey, data: PP });
                    Multicast(this.myPublicKey, "PREPARE", P);
                }
            }
        }
    }

    onReceivePrepare(senderPublicKey, P: PMessage) {
        const { message, view, term, blockHash } = decryptP(senderPublicKey, P.payload);

        if (message === "PREPARE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view === this.view &&
                    term === this.term &&
                    primary(view) !== senderPublicKey) {
                    LogP(term, view, "PREPARE", { pk: senderPublicKey, data: P });
                    if (this.isPrePrepared(term, view, blockHash)) {
                        if (getPrepareCount(term, view, blockHash) >= 2 * this.config.f) {
                            this.onPrepared(view, term, blockHash);
                        }
                    }
                }
            }
        }
    }

    isPrePrepared(term: number, view: number, blockHash: string): boolean {
        const PPLog = fetchFromLogPP(term, view, "PRE-PREPARE");
        const PPPayload = decryptPP(PPLog.pk, PPLog.data.payload);
        return PPPayload.blockHash === blockHash;
    }

    onPrepared(view: number, term: number, blockHash: string) {
        this.preparedProof = {
            preprepare: fetchFromLogPP(term, view, "PRE-PREPARE"),
            prepares: fetchFromLogP(this.term, this.view, "PREPARE")
        };

        const C: CMessage = {
            payload: signC(this.myPrivateKey, {
                message: "COMMIT",
                view,
                term,
                blockHash
            })
        };
        LogC(term, view, "COMMIT", { pk: this.myPublicKey, data: C });
        Multicast(this.myPublicKey, "COMMIT", C);
    }

    onReceiveCommit(senderPublicKey: string, C: CMessage) {
        const { message, view, term, blockHash } = decryptC(senderPublicKey, C.payload);

        if (message === "COMMIT") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    LogC(term, view, "COMMIT", { pk: senderPublicKey, data: C });
                    if (this.hasEnoughCommitVotes(term, view, blockHash)) {
                        this.commit(term, view, blockHash);
                    }
                }
            }
        }
    }

    hasEnoughCommitVotes(term: number, view: number, blockHash: string): boolean {
        if (view === this.view && term === this.term) {
            if (this.isPrePrepared(term, view, blockHash)) {
                if (getCommitCount(term, view) >= 2 * this.config.f + 1) {
                    return true;
                }
            }
        }

        return false;
    }

    commit(term: number, view: number, blockHash: string) {
        this.lastCommittedBlock = this.CB;
    }

    onTimeout() {
        this.view++;
        const VC: VCMessage = {
            payload: signVC(this.myPrivateKey, {
                message: "VIEW-CHANGE",
                view: this.view,
                term: this.term,
                preparedProof: this.preparedProof
            })
        };
        LogVC(this.term, this.view, "VIEW-CHANGE", { pk: this.myPublicKey, data: VC });
        Unicast(this.myPublicKey, primary(this.view), "VIEW-CHANGE", VC);
        this.startTimer();
    }

    onReceiveViewChange(senderPublicKey: string, VC: VCMessage) {
        const { message, view, term, preparedProof } = decryptVC(senderPublicKey, VC.payload);

        if (message === "VIEW-CHANGE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    if (primary(view) === this.myPublicKey) {

                        if (preparedProof) {
                            const { preprepare, prepares } = preparedProof;
                            if (preprepare && prepares && prepares.length >= 2 * this.config.f) {
                                const { CB } = preprepare.data;
                                if (CB) {
                                    const { view, term, blockHash } = decryptPP(senderPublicKey, preprepare.data.payload);
                                    const allPreparesPkAreUnique = prepares.reduce((prev, current) => prev.set(current.pk, true), new Map()).size === prepares.length;
                                    if (allPreparesPkAreUnique) {
                                        const isPrepareMatch = prepares
                                            .map(p => decryptP(p.pk, p.data.payload))
                                            .findIndex(p => p.view !== view || p.term !== term || p.blockHash !== blockHash) === -1;
                                        const isValidDigest = HASH(CB) === blockHash;
                                        // TODO: what do we do with isPrepareMatch and isValidDigest
                                    }
                                }
                            }
                        }

                        LogVC(term, view, "VIEW-CHANGE", { pk: senderPublicKey, data: VC });
                        if (this.isElected(term, view)) {
                            this.onElected(term, view);
                        }
                    }
                }
            }
        }
    }

    isViewChangeValid(preparedProof) {
    }

    isNewViewValid() {

    }

    isPreparedProofValid() {

    }

    isCommittedProofValid() {

    }

    isElected(term: number, view: number): boolean {
        return getViewChangeCount(term, view) >= 2 * this.config.f + 1;
    }

    onElected(term: number, view: number) {
        this.view = view;
        this.CB = undefined;

        const allViewChanges = fetchFromLogVC(term, view, "VIEW-CHANGE");
        const preparedProofs = allViewChanges.map(vc => decryptVC(vc.pk, vc.data.payload).preparedProof);
        const filtedPreparedProofs = preparedProofs.filter(preparedProof => preparedProof !== undefined);
        if (filtedPreparedProofs.length > 0) {
            const sortedPrepreparedProofs = filtedPreparedProofs.map(pp => decryptPP(pp.preprepare.pk, pp.preprepare.data.payload)).sort((a, b) => a.view - b.view);
            const latestPrereparedProof = filtedPreparedProofs[0];
            this.CB = latestPrereparedProof.preprepare.data.CB;
        } else {
            this.CB = constructBlock();
        }

        const PP: PPMessage = {
            payload: signPP(this.myPrivateKey, {
                message: "PRE-PREPARE",
                view: this.view,
                term: this.term,
                blockHash: HASH(this.CB),
            }),
            CB: this.CB
        };

        const newViewProof = sign(this.myPrivateKey, allViewChanges);
        const NV: NVMessage = {
            payload: signNV(this.myPrivateKey, {
                message: "NEW-VIEW",
                newViewProof,
                PP
            })
        };

        LogNV(term, view, "NEW-VIEW", { pk: this.myPublicKey, data: NV });
        Multicast(this.myPublicKey, "NEW-VIEW", NV);
    }

    onReceiveNewView(senderPublicKey: string, NV: NVMessage) {
        const { message, newViewProof, PP } = decryptNV(senderPublicKey, NV.payload);
        const { term, view } = decryptPP(senderPublicKey, PP.payload);

        if (message === "NEW-VIEW") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    this.initView(view);
                }
            }
        }
    }
}
