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
import { aSimpleTestNetwork } from "../builders/TestNetworkBuilder";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { PBFTMessagesHandlerMock } from "./PBFTMessagesHandlerMock";
import { messageToGossip } from "../gossip/GossipTestUtils";

chai.use(sinonChai);

describe("Network Messages Filter", () => {
    it("should be able to set the blockHeight and recive messages from gossip", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        gossip.multicast(pks, messageToGossip(aPrePrepareMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aPrepareMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aCommitMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aViewChangeMessage(node1.config.keyManager, 3, 0)));
        gossip.multicast(pks, messageToGossip(aNewViewMessage(node1.config.keyManager, 3, 0, aPrePrepareMessage(node1.config.keyManager, 3, 0, block), [])));

        expect(PPSpy).to.have.been.calledOnce;
        expect(PSpy).to.have.been.calledOnce;
        expect(CSpy).to.have.been.calledOnce;
        expect(VCSpy).to.have.been.calledOnce;
        expect(NVSpy).to.have.been.calledOnce;
    });

    it("should ignore messages if not the in current blockHeight", async () => {
        // a network with 4 nodes
        const { testNetwork } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossipFilter: NetworkMessagesFilter = new NetworkMessagesFilter(node0.config.networkCommunication, node0.pk);
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(2, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        gossip.multicast(pks, messageToGossip(aPrePrepareMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aPrepareMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aCommitMessage(node1.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aViewChangeMessage(node1.config.keyManager, 3, 0)));
        gossip.multicast(pks, messageToGossip(aNewViewMessage(node1.config.keyManager, 3, 0, aPrePrepareMessage(node1.config.keyManager, 3, 0, block), [])));

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
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node0.pk);
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        gossip.multicast(pks, messageToGossip(aPrePrepareMessage(node0.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aPrepareMessage(node0.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aCommitMessage(node0.config.keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aViewChangeMessage(node0.config.keyManager, 3, 0)));
        gossip.multicast(pks, messageToGossip(aNewViewMessage(node0.config.keyManager, 3, 0, aPrePrepareMessage(node0.config.keyManager, 3, 0, block), [])));

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
        const messagesHandler: MessagesHandler = new PBFTMessagesHandlerMock();

        const PPSpy = sinon.spy(messagesHandler, "onReceivePrePrepare");
        const PSpy = sinon.spy(messagesHandler, "onReceivePrepare");
        const CSpy = sinon.spy(messagesHandler, "onReceiveCommit");
        const VCSpy = sinon.spy(messagesHandler, "onReceiveViewChange");
        const NVSpy = sinon.spy(messagesHandler, "onReceiveNewView");

        gossipFilter.setBlockHeight(3, messagesHandler);

        const block: Block = aBlock(theGenesisBlock);
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const keyManager: KeyManager = new KeyManagerMock("External Node Pk");
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();

        gossip.multicast(pks, messageToGossip(aPrePrepareMessage(keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aPrepareMessage(keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aCommitMessage(keyManager, 3, 0, block)));
        gossip.multicast(pks, messageToGossip(aViewChangeMessage(keyManager, 3, 0)));
        gossip.multicast(pks, messageToGossip(aNewViewMessage(keyManager, 3, 0, aPrePrepareMessage(keyManager, 3, 0, block), [])));

        expect(PPSpy).to.not.have.been.calledOnce;
        expect(PSpy).to.not.have.been.calledOnce;
        expect(CSpy).to.not.have.been.calledOnce;
        expect(VCSpy).to.not.have.been.calledOnce;
        expect(NVSpy).to.not.have.been.calledOnce;
    });
});