import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aSimpleNetwork } from "./builders/NetworkBuilder";
import { InMemoryGossip } from "./gossip/InMemoryGossip";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const { network, blocksProvider, blocksValidator, triggerElection } = aSimpleNetwork(5);

        const testedNode = network.nodes[4];
        const nextLeader = network.nodes[1];
        const unicastSpy = sinon.spy(testedNode.pbft.gossip, "unicast");

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        triggerElection();
        await blocksValidator.resolveValidations();

        expect(unicastSpy).to.have.been.calledWith(testedNode.id, nextLeader.id, "view-change", { term: 0, newView: 1 });

        network.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const { network, blocksProvider, triggerElection } = aSimpleNetwork();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        network.startConsensusOnAllNodes(); // view 0
        await blocksProvider.afterAllBlocksProvided();

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

        network.shutDown();
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(block1, "block2");
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork(4, [block1, block2]);

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const multicastSpy = sinon.spy(gossip, "multicast");
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();

        gossip.onRemoteMessage(node0.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node2.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node3.id, "view-change", { term: 0, newView: 1 });
        await blocksProvider.afterAllBlocksProvided();

        expect(multicastSpy).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { term: 0, PP: { view: 1, term: 0, block: block2 } });
        network.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const { network, blocksProvider, blocksValidator, triggerElection } = aSimpleNetwork(4, [block1, block2, block3]);

        // block1
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();
        expect(network.nodes).to.agreeOnBlock(block1);

        // starting block2
        await blocksProvider.afterAllBlocksProvided();
        triggerElection(); // triggeting election before block2 was accepted, this will cause block3 to be accepted
        await blocksValidator.resolveValidations();

        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();
        expect(network.nodes).to.agreeOnBlock(block3);

        network.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const { network, blocksProvider, blocksValidator, triggerElection } = aSimpleNetwork(4, [block1, block2, block3]);

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const spy0 = sinon.spy(node0.pbft.gossip, "unicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "unicast");

        await blocksProvider.afterAllBlocksProvided();
        triggerElection();
        await blocksValidator.resolveValidations();

        expect(spy0).to.have.been.calledWith(node0.id, node1.id, "view-change", { term: 1, newView: 1 });
        expect(spy1).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { term: 1, PP: { term: 1, view: 1, block: block3 } });
        expect(spy2).to.have.been.calledWith(node2.id, node1.id, "view-change", { term: 1, newView: 1 });

        network.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", node2.id, { newView: 1 });
        await blocksValidator.resolveValidations();

        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        await blocksValidator.resolveValidations();

        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });
});