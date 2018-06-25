import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        let electionTrigger: ElectionTriggerMock;
        const electionTriggerFactory = (view: number) => {
            electionTrigger = new ElectionTriggerMock(view);
            return electionTrigger;
        };
        const nodeBuilder = aNode().electingLeaderUsing(electionTriggerFactory);
        const network = aNetwork().with(4).nodes.withCustomNode(nodeBuilder).build();
        const testedNode = network.nodes[4];
        const nextLeader = network.nodes[1];

        await network.processNextBlock();
        const unicastSpy = sinon.spy(testedNode.pbft.gossip, "unicast");
        electionTrigger.trigger();
        expect(unicastSpy).to.have.been.calledWith(testedNode.id, nextLeader.id, "view-change", { term: 1, newView: 1 });
        network.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const hangingValidator: BlocksValidatorMock = new BlocksValidatorMock(false);
        const electionTriggerList: Array<ElectionTriggerMock> = [];
        const electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTriggerList.push(t);
            return t;
        };
        const network = aNetwork()
            .with(4).nodes
            .electingLeaderUsing(electionTriggerFactory)
            .validateUsing(hangingValidator)
            .build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        await network.processNextBlock(); // view 0

        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 1 => view 1
        electionTriggerList.map(e => e.trigger());
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 2 => view 2
        electionTriggerList.map(e => e.trigger());
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.true;
        expect(node3.isLeader()).to.be.false;

        // elect node 3 => view 3
        electionTriggerList.map(e => e.trigger());
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.true;

        // back to elect node 0 => view 4
        electionTriggerList.map(e => e.trigger());
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        network.shutDown();
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(block1, "block2");
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const multicastSpy = sinon.spy(gossip, "multicast");
        await network.processNextBlock();

        gossip.onRemoteMessage(node0.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node2.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node3.id, "view-change", { term: 0, newView: 1 });

        await nextTick();
        expect(multicastSpy).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { PP: { view: 1, term: 1, block: block2 } });
        network.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const validator: BlocksValidatorMock = new BlocksValidatorMock(false);
        const electionTrigger: ElectionTriggerMock[] = [];
        const electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTrigger.push(t);
            return t;
        };
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const network = aNetwork()
            .blocksInPool([block1, block2, block3])
            .with(4).nodes
            .validateUsing(validator)
            .electingLeaderUsing(electionTriggerFactory)
            .build();

        // block1
        await network.processNextBlock();
        validator.resolve();
        await nextTick();
        expect(network.nodes).to.agreeOnBlock(block1);

        // starting block2
        await network.processNextBlock();

        // triggeting election before block2 was accepted, this will cause block3 to be accepted
        electionTrigger.map(t => t.trigger());
        await nextTick();

        validator.resolve();
        await nextTick();

        expect(network.nodes).to.agreeOnBlock(block3);

        network.shutDown();
    });

    it("should cycle back to the first node on view-change", async () => {
        const validator: BlocksValidatorMock = new BlocksValidatorMock(false);
        const electionTrigger: ElectionTriggerMock[] = [];
        const electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTrigger.push(t);
            return t;
        };

        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const network = aNetwork()
            .blocksInPool([block1, block2, block3])
            .with(4).nodes
            .electingLeaderUsing(electionTriggerFactory)
            .validateUsing(validator)
            .build();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        await network.processNextBlock();
        validator.resolve();
        await nextTick();

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const spy0 = sinon.spy(node0.pbft.gossip, "unicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "unicast");

        await network.processNextBlock();
        electionTrigger.map(t => t.trigger());
        await nextTick();

        validator.resolve();
        await nextTick();

        expect(spy0).to.have.been.calledWith(node0.id, node1.id, "view-change", { term: 1, newView: 1 });
        expect(spy1).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { PP: { term: 1, view: 1, block: block3 } });
        expect(spy2).to.have.been.calledWith(node2.id, node1.id, "view-change", { term: 1, newView: 1 });

        network.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", () => {
        const network = aNetwork().with(4).nodes.build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", node2.id, { newView: 1 });
        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });

    it("should not count view-change votes from the same node", () => {
        const network = aNetwork().with(4).nodes.build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.id, { newView: 1 });
        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });
});