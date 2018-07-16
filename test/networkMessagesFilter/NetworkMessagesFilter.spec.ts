import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aSimpleTestNetwork } from "../builders/TestNetworkBuilder";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";
import { aPayload } from "../builders/PayloadBuilder";
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
        gossip.broadcast("preprepare", aPayload(node1.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", aPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", aPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", aPayload(node1.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node1.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", aPayload(node1.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", aPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", aPayload(node1.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", aPayload(node1.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node1.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", aPayload(node0.pk, { term: 3, view: 0, block }));
        gossip.broadcast("prepare", aPayload(node0.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", aPayload(node0.pk, { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", aPayload(node0.pk, { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload(node0.pk, { term: 3, view: 0, PP: undefined }));

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
        gossip.broadcast("preprepare", aPayload("External Node Pk", { term: 3, view: 0, block }));
        gossip.broadcast("prepare", aPayload("External Node Pk", { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("commit", aPayload("External Node Pk", { term: 3, view: 0, blockHash: block.header.hash }));
        gossip.broadcast("view-change", aPayload("External Node Pk", { term: 3, newView: 0 }));
        gossip.broadcast("new-view", aPayload("External Node Pk", { term: 3, view: 0, PP: undefined }));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });
});