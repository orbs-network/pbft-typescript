import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", () => {
        let electionTrigger: ElectionTriggerMock;
        const electionTriggerFactory = (view: number) => {
            electionTrigger = new ElectionTriggerMock(view);
            return electionTrigger;
        };
        const nodeBuilder = aNode().electingLeaderUsing(electionTriggerFactory);
        const network = aNetwork().with(4).nodes.withCustomNode(nodeBuilder).build();
        const testedNode = network.nodes[4];
        const nextLeader = network.nodes[1];

        network.processNextBlock();
        const unicastSpy = sinon.spy(testedNode.pbft.gossip, "unicast");
        electionTrigger.trigger();
        expect(unicastSpy).to.have.been.calledWith(testedNode.id, nextLeader.id, "view-change", { term: 0, newView: 1 });
        network.shutDown();
    });

    it("should cycle back to the first node on view-change", () => {
        let electionTrigger0: ElectionTriggerMock;
        const electionTriggerFactory0 = (view: number) => {
            electionTrigger0 = new ElectionTriggerMock(view);
            return electionTrigger0;
        };
        const nodeBuilder0 = aNode().electingLeaderUsing(electionTriggerFactory0);

        let electionTrigger1: ElectionTriggerMock;
        const electionTriggerFactory1 = (view: number) => {
            electionTrigger1 = new ElectionTriggerMock(view);
            return electionTrigger1;
        };
        const nodeBuilder1 = aNode().electingLeaderUsing(electionTriggerFactory1);

        let electionTrigger2: ElectionTriggerMock;
        const electionTriggerFactory2 = (view: number) => {
            electionTrigger2 = new ElectionTriggerMock(view);
            return electionTrigger2;
        };
        const nodeBuilder2 = aNode().electingLeaderUsing(electionTriggerFactory2);

        let electionTrigger3: ElectionTriggerMock;
        const electionTriggerFactory3 = (view: number) => {
            electionTrigger3 = new ElectionTriggerMock(view);
            return electionTrigger3;
        };
        const nodeBuilder3 = aNode().electingLeaderUsing(electionTriggerFactory3);
        const network = aNetwork()
            .withCustomNode(nodeBuilder0)
            .withCustomNode(nodeBuilder1)
            .withCustomNode(nodeBuilder2)
            .withCustomNode(nodeBuilder3)
            .build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        network.processNextBlock(); // view 0

        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 1 => view 1
        electionTrigger0.trigger();
        electionTrigger1.trigger();
        electionTrigger2.trigger();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // elect node 2 => view 2
        electionTrigger0.trigger();
        electionTrigger1.trigger();
        electionTrigger2.trigger();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.true;
        expect(node3.isLeader()).to.be.false;

        // elect node 3 => view 3
        electionTrigger0.trigger();
        electionTrigger1.trigger();
        electionTrigger2.trigger();
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.true;

        // back to elect node 0 => view 4
        electionTrigger0.trigger();
        electionTrigger1.trigger();
        electionTrigger2.trigger();
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        network.shutDown();
    });

    it("should count 2f+1 view-change to be elected", () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        network.processNextBlock();

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const multicastSpy = sinon.spy(gossip, "multicast");
        gossip.onRemoteMessage(node0.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node2.id, "view-change", { term: 0, newView: 1 });
        gossip.onRemoteMessage(node3.id, "view-change", { term: 0, newView: 1 });
        expect(multicastSpy).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { PP: { view: 1, term: 0, block: block2 } });
        network.shutDown();
    });

    it("should accept a block constructed by the new leader", async () => {
        const electionTrigger: Array<ElectionTriggerMock[]> = [[], []];
        const electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTrigger[view].push(t);
            return t;
        };
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const network = aNetwork().blocksInPool([block1, block2, block3]).with(4).nodes.electingLeaderUsing(electionTriggerFactory).build();

        // block1
        network.processNextBlock();
        await nextTick();
        expect(network.nodes).to.agreeOnBlock(block1);

        // starting block2
        network.processNextBlock();

        // triggeting election before block2 was accepted, this will cause block3 to be accepted
        electionTrigger[0].map(t => t.trigger());
        await nextTick();

        expect(network.nodes).to.agreeOnBlock(block3);

        network.shutDown();
    });

    it("should cycle back to the first node on view-change", () => {
        // node 0
        let electionTrigger0: ElectionTriggerMock;
        const electionTriggerFactory0 = (view: number) => {
            electionTrigger0 = new ElectionTriggerMock(view);
            return electionTrigger0;
        };
        const nodeBuilder0 = aNode().electingLeaderUsing(electionTriggerFactory0);

        // node 1
        let electionTrigger1: ElectionTriggerMock;
        const electionTriggerFactory1 = (view: number) => {
            electionTrigger1 = new ElectionTriggerMock(view);
            return electionTrigger1;
        };
        const nodeBuilder1 = aNode().electingLeaderUsing(electionTriggerFactory1);

        // node 2
        let electionTrigger2: ElectionTriggerMock;
        const electionTriggerFactory2 = (view: number) => {
            electionTrigger2 = new ElectionTriggerMock(view);
            return electionTrigger2;
        };
        const nodeBuilder2 = aNode().electingLeaderUsing(electionTriggerFactory2);

        // node 3
        let electionTrigger3: ElectionTriggerMock;
        const electionTriggerFactory3 = (view: number) => {
            electionTrigger3 = new ElectionTriggerMock(view);
            return electionTrigger3;
        };
        const nodeBuilder3 = aNode().electingLeaderUsing(electionTriggerFactory3);

        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const network = aNetwork()
            .blocksInPool([block1, block2])
            .withCustomNode(nodeBuilder0)
            .withCustomNode(nodeBuilder1)
            .withCustomNode(nodeBuilder2)
            .withCustomNode(nodeBuilder3)
            .build();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        network.processNextBlock();

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const spy0 = sinon.spy(node0.pbft.gossip, "unicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "unicast");

        electionTrigger0.trigger();
        electionTrigger1.trigger();
        electionTrigger2.trigger();
        electionTrigger3.trigger();

        expect(spy0).to.have.been.calledWith(node0.id, node1.id, "view-change", { term: 0, newView: 1 });
        expect(spy1).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { PP: { term: 0, view: 1, block: block2 } });
        expect(spy2).to.have.been.calledWith(node2.id, node1.id, "view-change", { term: 0, newView: 1 });

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