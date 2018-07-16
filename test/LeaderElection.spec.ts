import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { aPayload } from "./builders/PayloadBuilder";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const { testNetwork, blocksProvider, blocksValidator, triggerElection } = aSimpleTestNetwork(5);

        const testedNode = testNetwork.nodes[4];
        const nextLeader = testNetwork.nodes[1];
        const gossip = testNetwork.getNodeGossip(testedNode.pk);
        const unicastSpy = sinon.spy(gossip, "unicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        triggerElection();
        await blocksValidator.resolveAllValidations(true);

        expect(unicastSpy).to.have.been.calledWith(testedNode.pk, nextLeader.pk, "view-change", aPayload(testedNode.pk, { term: 1, newView: 1 }));

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const { testNetwork, blocksProvider, triggerElection } = aSimpleTestNetwork();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes(); // view 0
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();

        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 1 => view 1
        triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 2 => view 2
        triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.true;
        expect(node3.isLeader()).to.be.false;

        // elect node 3 => view 3
        triggerElection();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.true;

        // back to elect node 0 => view 4
        triggerElection();
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        testNetwork.shutDown();
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork(4, [block1, block2]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const multicastSpy = sinon.spy(gossip, "multicast");
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();

        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { term: 1, newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { term: 1, newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { term: 1, newView: 1 }));
        await blocksProvider.provideNextBlock();

        expect(multicastSpy).to.have.been.calledWith(node1.pk, [node0.pk, node2.pk, node3.pk], "new-view", aPayload(node1.pk, { term: 1, view: 1, PP: aPayload(node1.pk, { view: 1, term: 1, block: block2 }) }));
        testNetwork.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const { testNetwork, blocksProvider, blocksValidator, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3]);

        // block1
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);
        expect(testNetwork.nodes).to.agreeOnBlock(block1);

        // starting block2
        await blocksProvider.provideNextBlock();
        triggerElection(); // triggeting election before block2 was accepted, this will cause block3 to be accepted
        await blocksValidator.resolveAllValidations(true);

        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);
        expect(testNetwork.nodes).to.agreeOnBlock(block3);

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const { testNetwork, blocksProvider, blocksValidator, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blocksValidator.resolveAllValidations(true);
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

        await blocksProvider.provideNextBlock();
        triggerElection();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash

        expect(spy0).to.have.been.calledWith(node0.pk, node1.pk, "view-change", aPayload(node0.pk, { term: 2, newView: 1 }));
        expect(spy1).to.have.been.calledWith(node1.pk, [node0.pk, node2.pk, node3.pk], "new-view", aPayload(node1.pk, { term: 2, view: 1, PP: aPayload(node1.pk, { term: 2, view: 1, block: block3 }) }));
        expect(spy2).to.have.been.calledWith(node2.pk, node1.pk, "view-change", aPayload(node2.pk, { term: 2, newView: 1 }));

        testNetwork.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { newView: 1 }));
        await blocksValidator.resolveAllValidations(true);

        expect(broadcastSpy).to.not.have.been.called;
        testNetwork.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.pk, { newView: 1 }));
        await blocksValidator.resolveAllValidations(true);

        expect(broadcastSpy).to.not.have.been.called;
        testNetwork.shutDown();
    });
});