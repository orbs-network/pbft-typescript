import * as chai from "chai";
import * as sinonChai from "sinon-chai";
import { expect } from "chai";
import { getLatestBlockFromViewChangeMessages } from "../../src/blockExtractor/BlockExtractor";
import { aViewChangeMessage } from "../builders/MessagesBuilder";
import { PreparedMessages } from "../../src/storage/PBFTStorage";
import { aPrepared } from "../builders/ProofBuilder";
import { Block, KeyManager } from "../../src";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { aSimpleTestNetwork } from "../builders/TestNetworkBuilder";
chai.use(sinonChai);

describe("Block Extractor", () => {
    it("Empty ViewChangeMessages should return undefined", async () => {
        const actual = getLatestBlockFromViewChangeMessages([]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages without block should be ignored", async () => {
        const keyManager: KeyManager = new KeyManagerMock("My PK");
        const VCMessage: ViewChangeMessage = aViewChangeMessage(keyManager, 1, 2);

        const actual = getLatestBlockFromViewChangeMessages([VCMessage]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages without content should be ignored", async () => {
        const keyManager: KeyManager = new KeyManagerMock("My PK");
        const VCMessage: ViewChangeMessage = aViewChangeMessage(keyManager, 1, 2);

        const actual = getLatestBlockFromViewChangeMessages([VCMessage]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages should return the latest view block", async () => {
        const { testNetwork } = aSimpleTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const blockOnView3 = aBlock(theGenesisBlock, "Block on View 3");
        const preparedOnView3: PreparedMessages = aPrepared(node3, [node1, node2], 1, 3, blockOnView3);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, 1, 5, preparedOnView3);

        const blockOnView4 = aBlock(theGenesisBlock, "Block on View 4");
        const preparedOnView4: PreparedMessages = aPrepared(node0, [node1, node2], 1, 4, blockOnView4);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, 1, 5, preparedOnView4);

        const actual = getLatestBlockFromViewChangeMessages([node0VCMessage, node2VCMessage]);
        expect(actual).to.deep.equal(blockOnView4);
    });
});