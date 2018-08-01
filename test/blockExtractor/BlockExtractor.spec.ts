import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { extractBlock } from "../../src/blockExtractor/BlockExtractor";
import { ViewChangePayload, PrePreparePayload, PreparePayload } from "../../src/networkCommunication/Payload";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPayload, aPrePreparePayload } from "../builders/PayloadBuilder";
import { KeyManager } from "../../src";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { anEmptyPreparedProof } from "../builders/ProofBuilder";
chai.use(sinonChai);

describe("Block Extractor", () => {

    it("should return undefined when all VC payloads don't have a preparedProof", async () => {
        const dummyKM: KeyManager = new KeyManagerMock("Dummy PK");
        const VC1: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: anEmptyPreparedProof() });
        const VC2: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: anEmptyPreparedProof() });
        const VC3: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: anEmptyPreparedProof() });
        const VCProof: ViewChangePayload[] = [VC1, VC2, VC3];
        const actual = extractBlock(VCProof);
        expect(actual).to.be.undefined;
    });

    it("should return the block from a VC that holds a blocks", async () => {
        const block = aBlock(theGenesisBlock);
        const dummyKM: KeyManager = new KeyManagerMock("Dummy PK");

        // proof with block
        const prepreparePayload: PrePreparePayload = aPrePreparePayload(dummyKM, 1, 5, block);
        const preparedProofWithBlock: PreparedProof = { prepreparePayload, preparePayloads: undefined };

        // empty proof
        const VC1: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: anEmptyPreparedProof() });
        const VC2: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: preparedProofWithBlock });
        const VC3: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 5, preparedProof: anEmptyPreparedProof() });
        const VCProof: ViewChangePayload[] = [VC1, VC2, VC3];
        const actual = extractBlock(VCProof);

        expect(actual).to.equal(block);
    });

    it("should return the block from the VC that holds the latest view", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const dummyKM: KeyManager = new KeyManagerMock("Dummy PK");

        // proof with block on view 7
        const prepreparePayload1: PrePreparePayload = aPrePreparePayload(dummyKM, 1, 7, block2);
        const preparedProofWithBlock1: PreparedProof = { prepreparePayload: prepreparePayload1, preparePayloads: undefined };

        // proof with block on view 5
        const prepreparePayload2: PrePreparePayload = aPrePreparePayload(dummyKM, 1, 5, block1);
        const preparedProofWithBlock2: PreparedProof = { prepreparePayload: prepreparePayload2, preparePayloads: undefined };

        // empty proof
        const VC1: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 2, preparedProof: anEmptyPreparedProof() });
        const VC2: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 2, preparedProof: preparedProofWithBlock1 });
        const VC3: ViewChangePayload = aPayload(dummyKM, { term: 1, newView: 2, preparedProof: preparedProofWithBlock2 });
        const VCProof: ViewChangePayload[] = [VC1, VC2, VC3];
        const actual = extractBlock(VCProof);

        expect(actual).to.equal(block2);
    });
});