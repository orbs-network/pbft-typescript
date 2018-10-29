import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { MessageType, NewViewMessage, PrePrepareMessage, ViewChangeMessage } from "../src/networkCommunication/Messages";
import { extractPreparedMessages, PreparedMessages } from "../src/storage/PreparedMessagesExtractor";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNewViewMessage, aPrePrepareMessage, aViewChangeMessage } from "./builders/MessagesBuilder";
import { aPrepared } from "./builders/ProofBuilder";
import { aTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { messageToGossip, gossipMessageCounter } from "./gossip/GossipTestUtils";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const testNetwork = aTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];
        const gossip = testNetwork.getNodeGossip(node0.publicKey);
        const sendToNodeSpy = sinon.spy(gossip, "sendToNode");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        node0.triggerElection(); node2.triggerElection(); node3.triggerElection();
        await testNetwork.resolveAllValidations(true);

        const q = 3;
        const node0Prepared: PreparedMessages = extractPreparedMessages(1, node0.pbftStorage, q);
        const newViewMessage = aViewChangeMessage(node0.keyManager, 1, 1, node0Prepared);
        expect(sendToNodeSpy).to.have.been.calledWith(node1.publicKey, messageToGossip(newViewMessage));

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const testNetwork = aTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes(); // view 0
        await nextTick();
        await testNetwork.provideNextBlock();

        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 1 => view 1
        node0.triggerElection(); node2.triggerElection(); node3.triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 2 => view 2
        node0.triggerElection(); node1.triggerElection(); node3.triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.true;
        expect(node3.isLeader()).to.be.false;

        // elect node 3 => view 3
        node0.triggerElection(); node1.triggerElection(); node2.triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.true;

        // back to elect node 0 => view 4
        node1.triggerElection(); node2.triggerElection(); node3.triggerElection();
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        testNetwork.shutDown();
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const testNetwork = aTestNetwork(4, [block1, block2]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const gossip = testNetwork.getNodeGossip(node1.publicKey);
        const multicastSpy = sinon.spy(gossip, "sendMessage");
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();

        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.keyManager, 1, 1);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.keyManager, 1, 1);
        const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.keyManager, 1, 1);
        gossip.onRemoteMessage(messageToGossip(node0VCMessage));
        gossip.onRemoteMessage(messageToGossip(node2VCMessage));
        gossip.onRemoteMessage(messageToGossip(node3VCMessage));
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.keyManager, 1, 1, block2);
        const VCProof: ViewChangeMessage[] = [node0VCMessage, node2VCMessage, node3VCMessage];
        const message: NewViewMessage = aNewViewMessage(node1.keyManager, 1, 1, PPMessage, VCProof);

        expect(multicastSpy).to.have.been.calledWith([node0.publicKey, node2.publicKey, node3.publicKey], messageToGossip(message));
        testNetwork.shutDown();
    });

    it("should offer the latest prepared VC when elected", async () => {
        const block1 = aBlock(theGenesisBlock);
        const testNetwork = aTestNetwork(4, [block1]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const node1Gossip = testNetwork.getNodeGossip(node1.publicKey);
        const multicastSpy = sinon.spy(node1Gossip, "sendMessage");
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();

        // VC with prepared proof on view 3
        const blockOnView3 = aBlock(block1, "Block on View 3");
        const preparedOnView3: PreparedMessages = aPrepared(node3, [node1, node2], 1, 3, blockOnView3);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.keyManager, 1, 5, preparedOnView3);

        // VC with prepared proof on view 4
        const blockOnView4 = aBlock(block1, "Block on View 4");
        const preparedOnView4: PreparedMessages = aPrepared(node0, [node1, node2], 1, 4, blockOnView4);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.keyManager, 1, 5, preparedOnView4);

        // VC with no prepared proof
        const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.keyManager, 1, 5);

        // send the view-change
        node1Gossip.onRemoteMessage(messageToGossip(node0VCMessage));
        node1Gossip.onRemoteMessage(messageToGossip(node2VCMessage));
        node1Gossip.onRemoteMessage(messageToGossip(node3VCMessage));
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.keyManager, 1, 5, blockOnView4);
        const votes: ViewChangeMessage[] = [node0VCMessage, node2VCMessage, node3VCMessage];
        const newViewMessage: NewViewMessage = aNewViewMessage(node1.keyManager, 1, 5, PPMessage, votes);

        expect(multicastSpy).to.have.been.calledWith([node0.publicKey, node2.publicKey, node3.publicKey], messageToGossip(newViewMessage));
        testNetwork.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const testNetwork = aTestNetwork(4, [block1, block2, block3]);
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        // block1
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block1);

        // starting block2
        await testNetwork.provideNextBlock();
        await nextTick();

        // triggeting election before block2 was accepted, this will cause block3 to be accepted
        node0.triggerElection();
        node1.triggerElection();
        node2.triggerElection();
        node3.triggerElection();
        await testNetwork.resolveAllValidations(true);
        await nextTick();

        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(block3);

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const testNetwork = aTestNetwork(4, [block1, block2, block3]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick(); // await for blockChain.getLastBlockHash
        await testNetwork.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const gossip0 = testNetwork.getNodeGossip(node0.publicKey);
        const gossip1 = testNetwork.getNodeGossip(node1.publicKey);
        const gossip2 = testNetwork.getNodeGossip(node2.publicKey);

        const spy0 = sinon.spy(gossip0, "sendToNode");
        const spy1 = sinon.spy(gossip1, "sendMessage");
        const spy2 = sinon.spy(gossip2, "sendToNode");

        await testNetwork.provideNextBlock();
        node0.triggerElection();
        node2.triggerElection();
        node3.triggerElection();

        await nextTick();
        await testNetwork.resolveAllValidations(true);
        await nextTick(); // await for blockChain.getLastBlockHash
        await testNetwork.provideNextBlock();
        await nextTick(); // await for blockChain.getLastBlockHash

        const q = 3;
        const node0Prepared: PreparedMessages = extractPreparedMessages(2, node0.pbftStorage, q);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.keyManager, 2, 1, node0Prepared);
        expect(spy0).to.have.been.calledWith(node1.publicKey, messageToGossip(node0VCMessage));

        const node2Prepared: PreparedMessages = extractPreparedMessages(2, node2.pbftStorage, q);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.keyManager, 2, 1, node2Prepared);
        expect(spy2).to.have.been.calledWith(node1.publicKey, messageToGossip(node2VCMessage));

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.keyManager, 2, 1, block3);
        const VCProof: ViewChangeMessage[] = node1.pbftStorage.getViewChangeMessages(2, 1);
        const node1NVExpectedMessage: NewViewMessage = aNewViewMessage(node1.keyManager, 2, 1, PPMessage, VCProof);
        expect(spy1).to.have.been.calledWith([node0.publicKey, node2.publicKey, node3.publicKey], messageToGossip(node1NVExpectedMessage));

        testNetwork.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const testNetwork = aTestNetwork();
        const node1 = testNetwork.nodes[1];
        const gossip = testNetwork.getNodeGossip(node1.publicKey);
        const multicastSpy = sinon.spy(gossip, "sendMessage");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        gossip.onRemoteMessage(messageToGossip(aViewChangeMessage(node1.keyManager, 1, 1)));
        gossip.onRemoteMessage(messageToGossip(aViewChangeMessage(node1.keyManager, 1, 1)));
        await testNetwork.resolveAllValidations(true);

        expect(gossipMessageCounter(multicastSpy, MessageType.NEW_VIEW)).to.equal(0);
        testNetwork.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const testNetwork = aTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossip = testNetwork.getNodeGossip(node1.publicKey);
        const multicastSpy = sinon.spy(gossip, "sendMessage");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        gossip.onRemoteMessage(messageToGossip(aViewChangeMessage(node1.keyManager, 1, 1)));
        gossip.onRemoteMessage(messageToGossip(aViewChangeMessage(node1.keyManager, 1, 1)));
        gossip.onRemoteMessage(messageToGossip(aViewChangeMessage(node1.keyManager, 1, 1)));
        await testNetwork.resolveAllValidations(true);

        expect(gossipMessageCounter(multicastSpy, MessageType.NEW_VIEW)).to.equal(0);

        testNetwork.shutDown();
    });
});