import * as chai from "chai";
import * as sinonChai from "sinon-chai";
import { expect } from "chai";
import { getLatestBlockFromViewChangeMessages } from "../../src/blockExtractor/BlockExtractor";
import { aViewChangeMessage, aPrePrepareMessage, aPrepareMessage } from "../builders/MessagesBuilder";
import { aPrepared } from "../builders/ProofBuilder";
import { Block, KeyManager } from "../../src";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { ViewChangeMessage } from "../../src/networkCommunication/Messages";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { aTestNetwork } from "../builders/TestNetworkBuilder";
import { PreparedMessages } from "../../src/storage/PreparedMessagesExtractor";
chai.use(sinonChai);

describe("Block Extractor", () => {
    it("Empty ViewChangeMessages should return undefined", async () => {
        const actual = getLatestBlockFromViewChangeMessages([]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages without content should be ignored", async () => {
        const keyManager: KeyManager = new KeyManagerMock("My PK");
        const VCMessage: ViewChangeMessage = aViewChangeMessage(keyManager, 1, 2);

        const actual = getLatestBlockFromViewChangeMessages([VCMessage]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages without block should be ignored", async () => {
        const keyManager1: KeyManager = new KeyManagerMock("PublicKey 1");
        const keyManager2: KeyManager = new KeyManagerMock("PublicKey 2");
        const keyManager3: KeyManager = new KeyManagerMock("PublicKey 3");
        const block = aBlock(theGenesisBlock);

        const preparedMessages: PreparedMessages = {
            preprepareMessage: undefined,
            prepareMessages: [
                aPrepareMessage(keyManager1, 1, 2, block),
                aPrepareMessage(keyManager2, 1, 2, block),
            ]
        };

        const VCMessage: ViewChangeMessage = aViewChangeMessage(keyManager3, 1, 2, preparedMessages);

        const actual = getLatestBlockFromViewChangeMessages([VCMessage]);
        expect(actual).to.be.undefined;
    });

    it("ViewChangeMessages should return the latest view block", async () => {
        const testNetwork = aTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const blockOnView3 = aBlock(theGenesisBlock, "Block on View 3");
        const preparedOnView3: PreparedMessages = aPrepared(node3, [node1, node2], 1, 3, blockOnView3);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.keyManager, 1, 5, preparedOnView3);

        const blockOnView4 = aBlock(theGenesisBlock, "Block on View 4");
        const preparedOnView4: PreparedMessages = aPrepared(node0, [node1, node2], 1, 4, blockOnView4);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.keyManager, 1, 5, preparedOnView4);

        const actual = getLatestBlockFromViewChangeMessages([node0VCMessage, node2VCMessage]);
        expect(actual).to.deep.equal(blockOnView4);
    });
});