type Block = {
    height: number;
    previousBlockHash: string;
};

function primary(view: number): string { return ""; }
function constructBlock(): Block { return { previousBlockHash: "", height: 0 }; }
function HASH(block): string { return ""; }
function Log(term: number, view: number, message: string, senderPublicKey: string, data) { }
function isPrePrepared(term: number, view: number): boolean { return true; }
function getPrepareCount(term: number, view: number): number { return 0; }
function getCommitCount(term: number, view: number): any { return 0; }
function Multicast(senderPublicKey: string, message: string, payload): void { }
function Unicast(senderPublicKey: string, targetPublicKey: string, message, payload): void { }
function valid(block: Block): boolean { return true; }
function sign(privateKey: string, content): string { return ""; }
function decrypt(publicKey: string, encryptedData): any { }

class PBFT {
    private myPublicKey: string;
    private privateKey: string;
    private lastCommittedBlock: Block;
    private timer;
    private term: number;
    private view: number;
    private CB: Block;

    constructor(private config: { f: number, TIMEOUT: number }) {
    }

    init() {
        this.term = this.lastCommittedBlock.height;
        this.view = 0;  // TODO: Is this needed?
        this.CB = undefined;
        this.timer(this.config.TIMEOUT);
        if (primary(this.view) === this.myPublicKey) {
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

    onReceivePrePrepare(senderPublicKey: string, PP: { payload: string, B: Block }) {
        const { view, term, digest } = decrypt(senderPublicKey, PP.payload);
        const { B } = PP;

        if (senderPublicKey !== this.myPublicKey) {
            if (view === this.view &&
                term === this.term &&
                primary(view) === senderPublicKey &&
                digest === HASH(B) &&
                B.previousBlockHash === HASH(this.lastCommittedBlock) &&
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

    isPrepared(term: number, view: number): boolean {
        if (view === this.view && term === this.term) {
            if (isPrePrepared(term, view)) {
                if (getPrepareCount(term, view) >= 2 * this.config.f) {
                    return true;
                }
            }
        }

        return false;
    }

    onPrepared(view: number, term: number, digest: string) {
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

    onReceiveCommit(senderPublicKey: string, C: { payload }) {
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
}