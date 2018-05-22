function primary(view: number) { }
function constructBlock() { }
function HASH(block) { }
function Log(term, view, message, senderPublicKey, data) { }
function isPrePrepared(term, view): any { }
function getPrepareCount(term, view): any { }
function getCommitCount(term, view): any { }
function Multicast(senderPublicKey, message, payload) { }
function valid(Block) { }
function sign(privateKey, content) { }
function decrypt(publicKey, encryptedData): any { }

class PBFT {
    private myPublicKey; // my publicKey
    private privateKey;
    private lastCommittedBlock;
    private timer;
    private term: number;
    private view: number;
    private CB;

    constructor(private config: { f, T }) {
    }

    init() {
        this.term = this.lastCommittedBlock.height;
        this.view = 0;  // TODO: Is this needed?
        this.CB = undefined;
        this.timer(this.config.T);
        if (primary(this.view)) {
            this.CB = constructBlock();
            const PP = {
                payload: sign(this.privateKey, {
                    view: this.view,
                    term: this.term,
                    digest: HASH(this.CB),
                }),
                CB: this.CB
            };
            Log(this.term, this.view, "PRE-PREPARE", this.myPublicKey, PP);
            Multicast(this.myPublicKey, "PRE-PREPARE", PP);
        }
    }

    onReceivePrePrepare(senderPublicKey, PP: { payload, B }) {
        const { view, term, digest } = decrypt(senderPublicKey, PP.payload);
        const { B } = PP;

        if (senderPublicKey !== this.myPublicKey) {
            if (view === this.view &&
                term === this.term &&
                primary(view) === senderPublicKey &&
                digest === HASH(B) &&
                B.prevBlock === HASH(this.lastCommittedBlock) &&
                valid(B) &&
                isPrePrepared(term, view) === false) {

                this.CB = B;
                const P = {
                    payload: sign(this.privateKey, {
                        view,
                        term,
                        digest,
                    })
                };
                Log(term, view, "PREPARE", senderPublicKey, P);
                Log(term, view, "PRE-PREPARE", senderPublicKey, PP);
                Multicast(this.myPublicKey, "PREPARE", P);
            }
        }
    }

    onReceivePrepare(senderPublicKey, P: { payload }) {
        const { view, term, digest } = decrypt(senderPublicKey, P.payload);

        if (senderPublicKey !== this.myPublicKey) {
            if (view === this.view &&
                term === this.term &&
                primary(view) !== senderPublicKey) {
                Log(term, view, "PREPARE", senderPublicKey, P);
                if (this.isPrepared(term, view)) {
                    this.onPrepared(view, term, digest);
                }
            }
        }
    }

    isPrepared(term, view): boolean {
        if (view === this.view && term === this.term) {
            if (isPrePrepared(term, view)) {
                if (getPrepareCount(term, view) >= 2 * this.config.f) {
                    return true;
                }
            }
        }

        return false;
    }

    onPrepared(view, term, digest) {
        const C = {
            payload: sign(this.privateKey, {
                view,
                term,
                digest
            })
        };
        Log(term, view, "COMMIT", this.myPublicKey, C);
        Multicast(this.myPublicKey, "COMMIT", C);
    }

    onReceiveCommit(senderPublicKey, C: { payload: { view, term, digest, i } }) {
        const { view, term, digest } = decrypt(senderPublicKey, C.payload);

        if (senderPublicKey !== this.myPublicKey) {
            if (view <= this.view && term === this.term) {
                Log(term, view, "COMMIT", senderPublicKey, C);
                if (this.isCommitted(term, view)) {
                    this.onCommitted(term, view, digest);
                }
            }
        }
    }

    isCommitted(term, view): boolean {
        if (view === this.view && term === this.term) {
            if (isPrePrepared(term, view)) {
                if (getCommitCount(term, view) >= 2 * this.config.f + 1) {
                    return true;
                }
            }
        }

        return false;
    }

    onCommitted(term, view, digest) {
        this.lastCommittedBlock = this.CB;
    }
}