import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../../src/Block";
import { PBFTGossipFilter } from "../../src/gossipFilter/PBFTGossipFilter";
import { PBFTMessagesHandler } from "../../src/gossipFilter/PBFTMessagesHandler";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aSimpleNetwork } from "../builders/NetworkBuilder";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";

chai.use(sinonChai);

describe("PBFT Gossip Filter", () => {
    it("should be able to set the term and recive messages from gossip", async () => {
        // a network with 4 nodes
        const {  network } = aSimpleNetwork();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];

        const gossipFilter: PBFTGossipFilter = new PBFTGossipFilter(node0.pbft.gossip, node0.id, network);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        node1.pbft.gossip.broadcast(node1.id, "preprepare", { term: 3, view: 0, block });
        node1.pbft.gossip.broadcast(node1.id, "prepare", { term: 3, view: 0, blockHash: block.hash});
        node1.pbft.gossip.broadcast(node1.id, "commit", { term: 3, view: 0, blockHash: block.hash });
        node1.pbft.gossip.broadcast(node1.id, "view-change", { term: 3, newView: 0 });
        node1.pbft.gossip.broadcast(node1.id, "new-view", { term: 3, PP: undefined });

        expect(PPSpy).to.have.been.calledOnce;
        expect(PSpy).to.have.been.calledOnce;
        expect(CSpy).to.have.been.calledOnce;
        expect(VCSpy).to.have.been.calledOnce;
        expect(NVSpy).to.have.been.calledOnce;
    });

    it("should ignore messages if not the in current term", async () => {
        // a network with 4 nodes
        const {  network } = aSimpleNetwork();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];

        const gossipFilter: PBFTGossipFilter = new PBFTGossipFilter(node0.pbft.gossip, node0.id, network);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(2, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        node1.pbft.gossip.broadcast(node1.id, "preprepare", { term: 3, view: 0, block });
        node1.pbft.gossip.broadcast(node1.id, "prepare", { term: 3, view: 0, blockHash: block.hash});
        node1.pbft.gossip.broadcast(node1.id, "commit", { term: 3, view: 0, blockHash: block.hash });
        node1.pbft.gossip.broadcast(node1.id, "view-change", { term: 3, newView: 0 });
        node1.pbft.gossip.broadcast(node1.id, "new-view", { term: 3, PP: undefined });

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });

    it("should ignore messages with my id", async () => {
        // a network with 4 nodes
        const {  network } = aSimpleNetwork();
        const node0 = network.nodes[0];

        const gossipFilter: PBFTGossipFilter = new PBFTGossipFilter(node0.pbft.gossip, node0.id, network);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        node0.pbft.gossip.broadcast(node0.id, "preprepare", { term: 3, view: 0, block });
        node0.pbft.gossip.broadcast(node0.id, "prepare", { term: 3, view: 0, blockHash: block.hash});
        node0.pbft.gossip.broadcast(node0.id, "commit", { term: 3, view: 0, blockHash: block.hash });
        node0.pbft.gossip.broadcast(node0.id, "view-change", { term: 3, newView: 0 });
        node0.pbft.gossip.broadcast(node0.id, "new-view", { term: 3, PP: undefined });

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });

    it("should ignore messages that are not part of the network", async () => {
        // a network with 4 nodes
        const {  network } = aSimpleNetwork();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];

        const gossipFilter: PBFTGossipFilter = new PBFTGossipFilter(node0.pbft.gossip, node0.id, network);
        const messagesHandler: PBFTMessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setTerm(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        node1.pbft.gossip.broadcast("node-666", "preprepare", { term: 3, view: 0, block });
        node1.pbft.gossip.broadcast("node-666", "prepare", { term: 3, view: 0, blockHash: block.hash});
        node1.pbft.gossip.broadcast("node-666", "commit", { term: 3, view: 0, blockHash: block.hash });
        node1.pbft.gossip.broadcast("node-666", "view-change", { term: 3, newView: 0 });
        node1.pbft.gossip.broadcast("node-666", "new-view", { term: 3, PP: undefined });

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });
});