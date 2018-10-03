import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { NewViewMessage, PreparedProof, PrePrepareMessage, ViewChangeMessage, ViewChangeConfirmation, MessageType } from "../src/networkCommunication/Messages";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNewViewMessage, aPrePrepareMessage, aViewChangeMessage, aPrepareMessage } from "./builders/MessagesBuilder";
import { aPreparedProof, aPrepared } from "./builders/ProofBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { PreparedMessages } from "../src/storage/PBFTStorage";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];
        const gossip = testNetwork.getNodeGossip(node0.pk);
        const unicastSpy = sinon.spy(gossip, "unicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        node0.triggerElection(); node2.triggerElection(); node3.triggerElection();
        await blockUtils.resolveAllValidations(true);

        const node0Prepared: PreparedMessages = node0.config.pbftStorage.getLatestPrepared(1, 1);
        expect(unicastSpy).to.have.been.calledWith(node1.pk, aViewChangeMessage(node0.config.keyManager, 1, 1, node0Prepared));

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes(); // view 0
        await nextTick();
        await blockUtils.provideNextBlock();

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
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4, [block1, block2]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const multicastSpy = sinon.spy(gossip, "multicast");
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, 1, 1);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, 1, 1);
        const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.config.keyManager, 1, 1);
        gossip.onRemoteMessage(node0VCMessage);
        gossip.onRemoteMessage(node2VCMessage);
        gossip.onRemoteMessage(node3VCMessage);
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.config.keyManager, 1, 1, block2);
        const VCProof: ViewChangeMessage[] = [node0VCMessage, node2VCMessage, node3VCMessage];
        const votes: ViewChangeConfirmation[] = VCProof.map(msg => ({ signedHeader: msg.signedHeader, sender: msg.sender }));
        const message: NewViewMessage = aNewViewMessage(node1.config.keyManager, 1, 1, PPMessage, votes);
        expect(multicastSpy).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], message);
        testNetwork.shutDown();
    });

    it("should offer the latest prepared VC when elected", async () => {
        const block1 = aBlock(theGenesisBlock);
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4, [block1]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const node1Gossip = testNetwork.getNodeGossip(node1.pk);
        const multicastSpy = sinon.spy(node1Gossip, "multicast");
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        // VC with prepared proof on view 3
        const blockOnView3 = aBlock(block1, "Block on View 3");
        const preparedOnView3: PreparedMessages = aPrepared(node3, [node1, node2], 1, 3, blockOnView3);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, 1, 5, preparedOnView3);

        // VC with prepared proof on view 4
        const blockOnView4 = aBlock(block1, "Block on View 4");
        const preparedOnView4: PreparedMessages = aPrepared(node0, [node1, node2], 1, 4, blockOnView4);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, 1, 5, preparedOnView4);

        // VC with no prepared proof
        const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.config.keyManager, 1, 5);

        // send the view-change
        node1Gossip.onRemoteMessage(node0VCMessage);
        node1Gossip.onRemoteMessage(node2VCMessage);
        node1Gossip.onRemoteMessage(node3VCMessage);
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.config.keyManager, 1, 5, blockOnView4);
        const votes: ViewChangeConfirmation[] = [node0VCMessage, node2VCMessage, node3VCMessage].map(msg => ({ signedHeader: msg.signedHeader, sender: msg.sender }));
        const newViewMessage: NewViewMessage = aNewViewMessage(node1.config.keyManager, 1, 5, PPMessage, votes);
        expect(multicastSpy).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], newViewMessage);
        testNetwork.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4, [block1, block2, block3]);
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        // block1
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block1);

        // starting block2
        await blockUtils.provideNextBlock();
        await nextTick();

        // triggeting election before block2 was accepted, this will cause block3 to be accepted
        node0.triggerElection();
        node1.triggerElection();
        node2.triggerElection();
        node3.triggerElection();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(block3);

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4, [block1, block2, block3]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockChain.getLastBlockHash
        await blockUtils.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const gossip0 = testNetwork.getNodeGossip(node0.pk);
        const gossip1 = testNetwork.getNodeGossip(node1.pk);
        const gossip2 = testNetwork.getNodeGossip(node2.pk);

        const spy0 = sinon.spy(gossip0, "unicast");
        const spy1 = sinon.spy(gossip1, "multicast");
        const spy2 = sinon.spy(gossip2, "unicast");

        await blockUtils.provideNextBlock();
        node0.triggerElection();
        node1.triggerElection();
        node2.triggerElection();
        node3.triggerElection();

        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick(); // await for blockChain.getLastBlockHash
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockChain.getLastBlockHash

        const node0Prepared: PreparedMessages = node0.config.pbftStorage.getLatestPrepared(2, 1);
        const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, 2, 1, node0Prepared);
        expect(spy0).to.have.been.calledWith(node1.pk, node0VCMessage);

        const node2Prepared: PreparedMessages = node2.config.pbftStorage.getLatestPrepared(2, 1);
        const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, 2, 1, node2Prepared);
        expect(spy2).to.have.been.calledWith(node1.pk, node2VCMessage);

        const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.config.keyManager, 2, 1, block3);
        const VCProof: ViewChangeMessage[] = node1.config.pbftStorage.getViewChangeMessages(2, 1, 1);
        const votes: ViewChangeConfirmation[] = VCProof.map(msg => ({ signedHeader: msg.signedHeader, sender: msg.sender }));
        const node1NVExpectedMessage: NewViewMessage = aNewViewMessage(node1.config.keyManager, 2, 1, PPMessage, votes);
        expect(spy1).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], node1NVExpectedMessage);

        testNetwork.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();
        const node1 = testNetwork.nodes[1];
        const gossip = testNetwork.getNodeGossip(node1.pk);
        const multicastSpy = sinon.spy(gossip, "multicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        gossip.onRemoteMessage(aViewChangeMessage(node1.config.keyManager, 1, 1));
        gossip.onRemoteMessage(aViewChangeMessage(node1.config.keyManager, 1, 1));
        await blockUtils.resolveAllValidations(true);

        const newViewSent = multicastSpy.getCalls().find(c => c.args[1].signedHeader.messageType === MessageType.NEW_VIEW) !== undefined;
        expect(newViewSent).to.be.false;
        testNetwork.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const multicastSpy = sinon.spy(gossip, "multicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        gossip.onRemoteMessage(aViewChangeMessage(node1.config.keyManager, 1, 1));
        gossip.onRemoteMessage(aViewChangeMessage(node1.config.keyManager, 1, 1));
        gossip.onRemoteMessage(aViewChangeMessage(node1.config.keyManager, 1, 1));
        await blockUtils.resolveAllValidations(true);

        const newViewSent = multicastSpy.getCalls().find(c => c.args[1].signedHeader.messageType === MessageType.NEW_VIEW) !== undefined;
        expect(newViewSent).to.be.false;

        testNetwork.shutDown();
    });
});