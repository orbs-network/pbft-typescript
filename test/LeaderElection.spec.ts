import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { calculateBlockHash } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aPayload, aPrePreparePayload, aPreparePayload } from "./builders/PayloadBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { PreparedProof } from "../src/storage/PBFTStorage";
import { ViewChangePayload, NewViewPayload, PrePreparePayload, PreparePayload } from "../src/networkCommunication/Payload";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const { testNetwork, blockUtils, triggerElection } = aSimpleTestNetwork(5);

        const testedNode = testNetwork.nodes[4];
        const nextLeader = testNetwork.nodes[1];
        const gossip = testNetwork.getNodeGossip(testedNode.pk);
        const unicastSpy = sinon.spy(gossip, "unicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        triggerElection();
        await blockUtils.resolveAllValidations(true);

        const node0PreparedProof: PreparedProof = testedNode.config.pbftStorage.getLatestPreparedProof(1, 1);
        expect(unicastSpy).to.have.been.calledWith(nextLeader.pk, "view-change", aPayload(testedNode.config.keyManager, { term: 1, newView: 1, preparedProof: node0PreparedProof }));

        testNetwork.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const { testNetwork, blockUtils, triggerElection } = aSimpleTestNetwork();

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

        const node0VCPayload: ViewChangePayload = aPayload(node0.config.keyManager, { term: 1, newView: 1 });
        const node2VCPayload: ViewChangePayload = aPayload(node2.config.keyManager, { term: 1, newView: 1 });
        const node3VCPayload: ViewChangePayload = aPayload(node3.config.keyManager, { term: 1, newView: 1 });
        gossip.onRemoteMessage("view-change", node0VCPayload);
        gossip.onRemoteMessage("view-change", node2VCPayload);
        gossip.onRemoteMessage("view-change", node3VCPayload);
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        const PPPayload: PrePreparePayload = aPrePreparePayload(node1.config.keyManager, 1, 1, block2);
        const VCProof: ViewChangePayload[] = [node0VCPayload, node2VCPayload, node3VCPayload];
        const payload: NewViewPayload = aPayload(node1.config.keyManager, { term: 1, view: 1, PP: PPPayload, VCProof });
        expect(multicastSpy).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], "new-view", payload);
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
        const blockHashOnView3 = calculateBlockHash(blockOnView3);
        const preparedProofOnView3: PreparedProof = {
            prepreparePayload: aPrePreparePayload(node3.config.keyManager, 1, 3, blockOnView3),
            preparePayloads: [
                aPreparePayload(node1.config.keyManager, 1, 3, blockOnView3),
                aPreparePayload(node2.config.keyManager, 1, 3, blockOnView3),
            ]
        };
        const node0VCPayload: ViewChangePayload = aPayload(node0.config.keyManager, { term: 1, newView: 5, preparedProof: preparedProofOnView3 });

        // VC with prepared proof on view 4
        const blockOnView4 = aBlock(block1, "Block on View 4");
        const preparedProofOnView4: PreparedProof = {
            prepreparePayload: aPrePreparePayload(node0.config.keyManager, 1, 4, blockOnView4),
            preparePayloads: [
                aPreparePayload(node1.config.keyManager, 1, 4, blockOnView4),
                aPreparePayload(node2.config.keyManager, 1, 4, blockOnView4),
            ]
        };
        const node2VCPayload: ViewChangePayload = aPayload(node2.config.keyManager, { term: 1, newView: 5, preparedProof: preparedProofOnView4 });

        // VC with no prepared proof
        const node3VCPayload: ViewChangePayload = aPayload(node3.config.keyManager, { term: 1, newView: 5, preparedProof: undefined });

        // send the view-change
        node1Gossip.onRemoteMessage("view-change", node0VCPayload);
        node1Gossip.onRemoteMessage("view-change", node2VCPayload);
        node1Gossip.onRemoteMessage("view-change", node3VCPayload);
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        const PPPayload: PrePreparePayload = aPrePreparePayload(node1.config.keyManager, 1, 5, blockOnView4);
        const VCProof: ViewChangePayload[] = [node0VCPayload, node2VCPayload, node3VCPayload];
        const payload: NewViewPayload = aPayload(node1.config.keyManager, { term: 1, view: 5, PP: PPPayload, VCProof });
        expect(multicastSpy).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], "new-view", payload);
        testNetwork.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const { testNetwork, blockUtils, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3]);

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
        triggerElection(); // triggeting election before block2 was accepted, this will cause block3 to be accepted
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
        const { testNetwork, blockUtils, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
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
        triggerElection();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash

        const node0PreparedProof: PreparedProof = node0.config.pbftStorage.getLatestPreparedProof(2, 1);
        const node0VCPayload: ViewChangePayload = aPayload(node0.config.keyManager, { term: 2, newView: 1, preparedProof: node0PreparedProof });
        expect(spy0).to.have.been.calledWith(node1.pk, "view-change", node0VCPayload);

        const node2PreparedProof: PreparedProof = node2.config.pbftStorage.getLatestPreparedProof(2, 1);
        const node2VCPayload: ViewChangePayload = aPayload(node2.config.keyManager, { term: 2, newView: 1, preparedProof: node2PreparedProof });
        expect(spy2).to.have.been.calledWith(node1.pk, "view-change", node2VCPayload);

        const PPPayload: PrePreparePayload = aPrePreparePayload(node1.config.keyManager, 2, 1, block3);
        const VCProof: ViewChangePayload[] = node1.config.pbftStorage.getViewChangeProof(2, 1, 1);
        const node1NVExpectedPayload: NewViewPayload = aPayload(node1.config.keyManager, { term: 2, view: 1, PP: PPPayload, VCProof });
        expect(spy1).to.have.been.calledWith([node0.pk, node2.pk, node3.pk], "new-view", node1NVExpectedPayload);

        testNetwork.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        gossip.onRemoteMessage("view-change", aPayload(node1.config.keyManager, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.config.keyManager, { newView: 1 }));
        await blockUtils.resolveAllValidations(true);

        expect(broadcastSpy).to.not.have.been.called;
        testNetwork.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();
        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];

        const gossip = testNetwork.getNodeGossip(node1.pk);
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        gossip.onRemoteMessage("view-change", aPayload(node1.config.keyManager, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.config.keyManager, { newView: 1 }));
        gossip.onRemoteMessage("view-change", aPayload(node1.config.keyManager, { newView: 1 }));
        await blockUtils.resolveAllValidations(true);

        expect(broadcastSpy).to.not.have.been.called;
        testNetwork.shutDown();
    });
});