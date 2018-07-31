import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { NetworkMessagesFilter } from "../../src/networkCommunication/NetworkMessagesFilter";
import { PBFTMessagesHandler } from "../../src/networkCommunication/PBFTMessagesHandler";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aPayload, aPreparePayload, aPrePreparePayload } from "../builders/PayloadBuilder";
import { aSimpleTestNetwork } from "../builders/TestNetworkBuilder";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { KeyManager } from "../../src";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";

chai.use(sinonChai);

describe("Network Messages Filter", () => {
    it("should be able to set the term and recive messages from gossip", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const blockHash = calculateBlockHash(block);
        gossip.broadcast("preprepare", aPrePreparePayload(node1.config.keyManager, 3, 0, block));
        gossip.broadcast("prepare", aPreparePayload(node1.config.keyManager, 3, 0, block));
        gossip.broadcast("commit", aPayload(node1.config.keyManager, { term: 3, view: 0, blockHash }));
        gossip.broadcast("view-change", aPayload(node1.config.keyManager, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node1.config.keyManager, { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.have.been.calledOnce;
        expect(PSpy).to.have.been.calledOnce;
        expect(CSpy).to.have.been.calledOnce;
        expect(VCSpy).to.have.been.calledOnce;
        expect(NVSpy).to.have.been.calledOnce;
    });

    it("should ignore messages if not the in current term", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(2, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const blockHash = calculateBlockHash(block);
        gossip.broadcast("preprepare", aPreparePayload(node1.config.keyManager, 3, 0, block));
        gossip.broadcast("prepare", aPreparePayload(node1.config.keyManager, 3, 0, block));
        gossip.broadcast("commit", aPayload(node1.config.keyManager, { term: 3, view: 0, blockHash }));
        gossip.broadcast("view-change", aPayload(node1.config.keyManager, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node1.config.keyManager, { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });

    it("should ignore messages with my public key", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node0.pk);
        const blockHash = calculateBlockHash(block);
        gossip.broadcast("preprepare", aPrePreparePayload(node0.config.keyManager, 3, 0, block));
        gossip.broadcast("prepare", aPreparePayload(node0.config.keyManager, 3, 0, block));
        gossip.broadcast("commit", aPayload(node0.config.keyManager, { term: 3, view: 0, blockHash }));
        gossip.broadcast("view-change", aPayload(node0.config.keyManager, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node0.config.keyManager, { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });

    it("should ignore messages that are not part of the network", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const blockHash = calculateBlockHash(block);
        const keyManager: KeyManager = new KeyManagerMock("External Node Pk");
        gossip.broadcast("preprepare", aPrePreparePayload(keyManager, 3, 0, block));
        gossip.broadcast("prepare", aPreparePayload(keyManager, 3, 0, block));
        gossip.broadcast("commit", aPayload(keyManager, { term: 3, view: 0, blockHash }));
        gossip.broadcast("view-change", aPayload(keyManager, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(keyManager, { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });
});