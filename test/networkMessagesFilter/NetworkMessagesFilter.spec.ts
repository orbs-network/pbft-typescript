import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aSimpleTestNetwork } from "../builders/TestNetworkBuilder";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";
import { buildPayload } from "../payload/PayloadUtils";
import { PBFTMessagesHandler } from "../../src/networkCommunication/PBFTMessagesHandler";
import { NetworkMessagesFilter } from "../../src/networkCommunication/NetworkMessagesFilter";

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
        gossip.broadcast("preprepare", buildPayload(node1.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", buildPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", buildPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", buildPayload(node1.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", buildPayload(node1.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", buildPayload(node1.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", buildPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", buildPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", buildPayload(node1.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", buildPayload(node1.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", buildPayload(node0.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", buildPayload(node0.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", buildPayload(node0.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", buildPayload(node0.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", buildPayload(node0.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", buildPayload("External Node Pk", { term: 3, view: 0, block }));
        gossip.broadcast("prepare", buildPayload("External Node Pk", { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", buildPayload("External Node Pk", { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", buildPayload("External Node Pk", { term: 3, newView: 0 }));
        gossip.broadcast("new-view", buildPayload("External Node Pk", { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });
});