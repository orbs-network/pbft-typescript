function primary(view: number): string { return ""; }
function constructBlock(): Block { return { previousBlockHash: "", height: 0 }; }
function HASH(block): string { return ""; }
function Log(term: number, view: number, message: string, { pk: string, data: any }) { }
function fetchFromLog(term: number, view: number, message: string): any { }
function isPrePrepared(term: number, view: number): boolean { return true; }
function getPrepareCount(term: number, view: number, digest: string): number { return 0; }
function getCommitCount(term: number, view: number): any { return 0; }
function getViewChangeCount(term: number, view: number): any { return 0; }
function Multicast(senderPublicKey: string, message: string, payload): void { }
function Unicast(senderPublicKey: string, targetPublicKey: string, message, payload): void { }
function valid(block: Block): boolean { return true; }
function sign(privateKey: string, content: any): string { return ""; }
function decrypt(publicKey: string, encryptedData): any { return undefined; }

type Block = {
    height: number;
    previousBlockHash: string;
};

type MessageType = "PRE-PREPARE" | "PREPARE" | "COMMIT";
type MessageContent = {
    message: MessageType,
    view: number,
    term: number,
    digest: string
};

type PPMessage = {
    payload: string;
    CB: Block;
};

type PMessage = {
    payload: string;
};

type CMessage = {
    payload: string;
};

class PBFT {
    private myPublicKey: string;
    private myPrivateKey: string;
    private lastCommittedBlock: Block;
    private timer;
    private term: number;
    private view: number;
    private CB: Block;
    private preparedProof;

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
                payload: sign(this.myPrivateKey, {
                    message: "PRE-PREPARE",
                    view: this.view,
                    term: this.term,
                    digest: HASH(this.CB),
                }),
                CB: this.CB
            };
            Log(this.term, this.view, "PRE-PREPARE", { pk: this.myPublicKey, data: PP });
            Multicast(this.myPublicKey, "PRE-PREPARE", PP);
        }
    }

    startTimer() {
        this.timer(this.config.TIMEOUT * 2 ^ this.view);
    }

    onReceivePrePrepare(senderPublicKey: string, PP: PPMessage) {
        const { message, view, term, digest } = decrypt(senderPublicKey, PP.payload);
        const B = PP.CB;

        if (message === "PRE-PREPARE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view === this.view &&
                    term === this.term &&
                    primary(view) === senderPublicKey &&
                    digest === HASH(B) &&
                    B.previousBlockHash === HASH(this.lastCommittedBlock) &&
                    valid(B) &&
                    isPrePrepared(term, view) === false) {

                    this.CB = B;
                    const P: PMessage = {
                        payload: sign(this.myPrivateKey, {
                            message: "PREPARE",
                            view,
                            term,
                            digest,
                        })
                    };
                    Log(term, view, "PREPARE", { pk: senderPublicKey, data: P });
                    Log(term, view, "PRE-PREPARE", { pk: senderPublicKey, data: PP });
                    Multicast(this.myPublicKey, "PREPARE", P);
                }
            }
        }
    }

    onReceivePrepare(senderPublicKey, P: PMessage) {
        const { message, view, term, digest } = decrypt(senderPublicKey, P.payload);

        if (message === "PREPARE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view === this.view &&
                    term === this.term &&
                    primary(view) !== senderPublicKey) {
                    Log(term, view, "PREPARE", { pk: senderPublicKey, data: P });
                    if (this.isPrepared(term, view, digest)) {
                        this.onPrepared(view, term, digest);
                    }
                }
            }
        }
    }

    isPrePrepared(term: number, view: number, digest: string): boolean {
        return fetchFromLog(term, view, "PRE-PREPARE").payload.digest === digest;
    }

    isPrepared(term: number, view: number, digest: string): boolean {
        if (view === this.view && term === this.term) {
            if (this.isPrePrepared(term, view, digest)) {
                if (getPrepareCount(term, view, digest) >= 2 * this.config.f) {
                    return true;
                }
            }
        }

        return false;
    }

    onPrepared(view: number, term: number, digest: string) {
        const preprepare = fetchFromLog(term, view, "PRE-PREPARE");
        const { B } = preprepare;
        this.preparedProof = {
            preprepare,
            prepares: fetchFromLog(this.term, this.view, "PREPARE")
        };

        const C: CMessage = {
            payload: sign(this.myPrivateKey, {
                message: "COMMIT",
                view,
                term,
                digest
            })
        };
        Log(term, view, "COMMIT", { pk: this.myPublicKey, data: C });
        Multicast(this.myPublicKey, "COMMIT", C);
    }

    onReceiveCommit(senderPublicKey: string, C: CMessage) {
        const { message, view, term, digest } = decrypt(senderPublicKey, C.payload);

        if (message === "COMMIT") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    Log(term, view, "COMMIT", { pk: senderPublicKey, data: C });
                    if (this.isCommitted(term, view)) {
                        this.onCommitted(term, view, digest);
                    }
                }
            }
        }
    }

    isCommitted(term: number, view: number): boolean {
        if (view === this.view && term === this.term) {
            if (isPrePrepared(term, view)) {
                if (getCommitCount(term, view) >= 2 * this.config.f + 1) {
                    return true;
                }
            }
        }

        return false;
    }

    onCommitted(term: number, view: number, digest: string) {
        this.lastCommittedBlock = this.CB;
    }

    onTimeout() {
        this.view++;
        const VC = {
            payload: sign(this.myPrivateKey, {
                message: "VIEW-CHANGE",
                view: this.view,
                term: this.term,
                preparedProof: this.preparedProof
            })
        };
        Log(this.term, this.view, "VIEW_CHANGE", { pk: this.myPublicKey, data: VC });
        Unicast(this.myPublicKey, primary(this.view), "VIEW_CHANGE", VC);
        this.startTimer();
    }

    onReceiveViewChange(senderPublicKey: string, VC) {
        const { message, view, term, preparedProof } = decrypt(senderPublicKey, VC.payload);

        const { preprepare, prepares } = preparedProof;

        if (message === "VIEW-CHANGE") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    if (primary(view) === this.myPublicKey) {
                        Log(term, view, "VIEW-CHANGE", { pk: senderPublicKey, data: VC });
                        if (this.isElected(term, view)) {
                            this.onElected(term, view);
                        }
                    }
                }
            }
        }
    }

    isViewChangeValid() {

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

        const allViewChanges = fetchFromLog(term, view, "VIEW-CHANGE");
        const preparedProofs = allViewChanges.map(vc => decrypt(vc.pk, vc.data).payload.preparedProof);
        const filtedPreparedProofs = preparedProofs.filter(preparedProof => preparedProof !== undefined);
        const sortedPreparedProofs = filtedPreparedProofs.sort((a, b) => a.preprepare.view - b.preprepare.view);
        if (preparedProofs.length > 0) {
            const latestViewPreparedProof = preparedProofs[0];
            this.CB = latestViewPreparedProof.preprepare.B;
        } else {
            this.CB = constructBlock();
        }

        const PP: PPMessage = {
            payload: sign(this.myPrivateKey, {
                message: "PRE-PREPARE",
                view: this.view,
                term: this.term,
                digest: HASH(this.CB),
            }),
            CB: this.CB
        };

        const newViewProof = sign(this.myPrivateKey, [allViewChanges]);
        const NV = {
            payload: sign(this.myPrivateKey, {
                message: "NEW-VIEW",
                newViewProof,
                PP
            })
        };

        Log(term, view, "NEW-VIEW", { pk: this.myPublicKey, data: NV });
        Multicast(this.myPublicKey, "NEW-VIEW", NV);
    }

    onReceiveNewView(senderPublicKey: string, NV) {
        const { message, newViewProof, PP } = decrypt(senderPublicKey, NV.payload);
        const { term, view } = decrypt(senderPublicKey, PP.payload);

        if (message === "NEW-VIEW") {
            if (senderPublicKey !== this.myPublicKey) {
                if (view >= this.view && term === this.term) {
                    this.initView(view);
                }
            }
        }
    }
}
