import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src";
import { Block } from "../../src/Block";
import { MessagesHandler } from "../../src/networkCommunication/MessagesHandler";
import { NetworkMessagesFilter } from "../../src/networkCommunication/NetworkMessagesFilter";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { aCommitMessage, aNewViewMessage, aPrepareMessage, aPrePrepareMessage, aViewChangeMessage } from "../builders/MessagesBuilder";
import { aTestNetwork } from "../builders/TestNetworkBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";
import { messageToGossip } from "../gossip/GossipTestUtils";

chai.use(sinonChai);

describe("Network Messages Filter", () => {
    it("should be able to set the blockHeight and recive messages from gossip", async () => {
        // a network with 4 nodes
        const testNetwork = aTestNetwork();
        const nodeUnderTest = testNetwork.nodes[0];
        const senderNode = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(nodeUnderTest.gossip, nodeUnderTest.publicKey);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const senderGossip = testNetwork.getNodeGossip(senderNode.publicKey);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        senderGossip.sendMessage(pks, messageToGossip(aPrePrepareMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aPrepareMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aCommitMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aViewChangeMessage(senderNode.keyManager, 3, 0)));
        senderGossip.sendMessage(pks, messageToGossip(aNewViewMessage(senderNode.keyManager, 3, 0, aPrePrepareMessage(senderNode.keyManager, 3, 0, block), [])));

        expect(PPSpy).to.have.been.calledOnce;
        expect(PSpy).to.have.been.calledOnce;
        expect(CSpy).to.have.been.calledOnce;
        expect(VCSpy).to.have.been.calledOnce;
        expect(NVSpy).to.have.been.calledOnce;
    });

    it("should ignore messages if not the in current blockHeight", async () => {
        // a network with 4 nodes
        const testNetwork = aTestNetwork();
        const nodeUnderTest = testNetwork.nodes[0];
        const senderNode = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(nodeUnderTest.gossip, nodeUnderTest.publicKey);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(2, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const senderGossip = testNetwork.getNodeGossip(senderNode.publicKey);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        senderGossip.sendMessage(pks, messageToGossip(aPrePrepareMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aPrepareMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aCommitMessage(senderNode.keyManager, 3, 0, block)));
        senderGossip.sendMessage(pks, messageToGossip(aViewChangeMessage(senderNode.keyManager, 3, 0)));
        senderGossip.sendMessage(pks, messageToGossip(aNewViewMessage(senderNode.keyManager, 3, 0, aPrePrepareMessage(senderNode.keyManager, 3, 0, block), [])));

        expect(PPSpy).to.not.have.been.called;
        expect(PSpy).to.not.have.been.called;
        expect(CSpy).to.not.have.been.called;
        expect(VCSpy).to.not.have.been.called;
        expect(NVSpy).to.not.have.been.called;
    });

    it("should ignore messages with my public key", async () => {
        // a network with 4 nodes
        const testNetwork = aTestNetwork();
        const nodeUnderTest = testNetwork.nodes[0];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(nodeUnderTest.gossip, nodeUnderTest.publicKey);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(nodeUnderTest.publicKey);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        gossip.sendMessage(pks, messageToGossip(aPrePrepareMessage(nodeUnderTest.keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aPrepareMessage(nodeUnderTest.keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aCommitMessage(nodeUnderTest.keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aViewChangeMessage(nodeUnderTest.keyManager, 3, 0)));
        gossip.sendMessage(pks, messageToGossip(aNewViewMessage(nodeUnderTest.keyManager, 3, 0, aPrePrepareMessage(nodeUnderTest.keyManager, 3, 0, block), [])));

        expect(PPSpy).to.not.have.been.called;
        expect(PSpy).to.not.have.been.called;
        expect(CSpy).to.not.have.been.called;
        expect(VCSpy).to.not.have.been.called;
        expect(NVSpy).to.not.have.been.called;
    });

    it("should ignore messages that are not part of the network", async () => {
        // a network with 4 nodes
        const testNetwork = aTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.gossip, node0.publicKey);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.publicKey);
        const keyManager: KeyManager = new KeyManagerMock("External Node Pk");
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();

        gossip.sendMessage(pks, messageToGossip(aPrePrepareMessage(keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aPrepareMessage(keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aCommitMessage(keyManager, 3, 0, block)));
        gossip.sendMessage(pks, messageToGossip(aViewChangeMessage(keyManager, 3, 0)));
        gossip.sendMessage(pks, messageToGossip(aNewViewMessage(keyManager, 3, 0, aPrePrepareMessage(keyManager, 3, 0, block), [])));

        expect(PPSpy).to.not.have.been.called;
        expect(PSpy).to.not.have.been.called;
        expect(CSpy).to.not.have.been.called;
        expect(VCSpy).to.not.have.been.called;
        expect(NVSpy).to.not.have.been.called;
    });
});