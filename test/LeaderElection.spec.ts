import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "./gossip/InMemoryGossip";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", () => {
        const electionTriggerMock = new ElectionTriggerMock();
        const nodeBuilder = aNode().electingLeaderUsing(electionTriggerMock);
        const network = aNetwork().with(4).nodes.withCustomeNode(nodeBuilder).build();
        const testedNode = network.nodes[4];
        const nextLeader = network.nodes[1];

        const unicastSpy = sinon.spy(testedNode.pbft.gossip, "unicast");
        electionTriggerMock.trigger();
        expect(unicastSpy).to.have.been.calledWith(testedNode.id, nextLeader.id, "view-change", { newView: 1 });
        network.shutDown();
    });

    it("should cycle back to the first node on view-change", () => {
        const electionTriggerMock = new ElectionTriggerMock();
        const network = aNetwork().with(3).nodes.electingLeaderUsing(electionTriggerMock).build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];

        const spy0 = sinon.spy(node0.pbft.gossip, "unicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "unicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "unicast");

        // elect node 1
        electionTriggerMock.trigger();
        expect(spy0).to.have.been.calledWith(node0.id, node1.id, "view-change", { newView: 1 });
        expect(spy1).to.not.have.been.calledWith(node1.id, node1.id, "view-change", { newView: 1 });
        expect(spy2).to.have.been.calledWith(node2.id, node1.id, "view-change", { newView: 1 });

        // elect node 2
        electionTriggerMock.trigger();
        expect(spy0).to.have.been.calledWith(node0.id, node2.id, "view-change", { newView: 2 });
        expect(spy1).to.have.been.calledWith(node1.id, node2.id, "view-change", { newView: 2 });
        expect(spy2).not.to.have.been.calledWith(node2.id, node2.id, "view-change", { newView: 2 });

        // // back to elect node 0
        electionTriggerMock.trigger();
        expect(spy0).not.to.have.been.calledWith(node0.id, node0.id, "view-change", { newView: 3 });
        expect(spy1).to.have.been.calledWith(node1.id, node0.id, "view-change", { newView: 3 });
        expect(spy2).to.have.been.calledWith(node2.id, node0.id, "view-change", { newView: 3 });

        network.shutDown();
    });

    it("should count 2f+1 view-change to be elected", () => {
        const network = aNetwork().with(4).nodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.pbft.gossip as InMemoryGossip;
        const multicastSpy = sinon.spy(gossip, "multicast");
        gossip.onRemoteMessage(node0.id, "view-change", { newView: 1 });
        gossip.onRemoteMessage(node2.id, "view-change", { newView: 1 });
        gossip.onRemoteMessage(node3.id, "view-change", { newView: 1 });
        expect(multicastSpy).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { view: 1 });
        network.shutDown();
    });

    it("should cycle back to the first node on view-change", () => {
        const electionTrigger0 = new ElectionTriggerMock();
        const nodeBuilder0 = aNode().electingLeaderUsing(electionTrigger0);
        const electionTrigger1 = new ElectionTriggerMock();
        const nodeBuilder1 = aNode().electingLeaderUsing(electionTrigger1);
        const electionTrigger2 = new ElectionTriggerMock();
        const nodeBuilder2 = aNode().electingLeaderUsing(electionTrigger2);
        const electionTrigger3 = new ElectionTriggerMock();
        const nodeBuilder3 = aNode().electingLeaderUsing(electionTrigger3);
        const network = aNetwork()
            .withCustomeNode(nodeBuilder0)
            .withCustomeNode(nodeBuilder1)
            .withCustomeNode(nodeBuilder2)
            .withCustomeNode(nodeBuilder3)
            .build();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        expect(node0.isLeader()).to.true;
        expect(node1.isLeader()).to.false;
        expect(node2.isLeader()).to.false;
        expect(node3.isLeader()).to.false;

        const spy0 = sinon.spy(node0.pbft.gossip, "unicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "unicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");

        electionTrigger0.trigger();
        electionTrigger2.trigger();
        electionTrigger1.trigger(); // timed out last

        expect(spy0).to.have.been.calledWith(node0.id, node1.id, "view-change", { newView: 1 });
        expect(spy2).to.have.been.calledWith(node2.id, node1.id, "view-change", { newView: 1 });
        expect(spy1).to.have.been.calledWith(node1.id, [node0.id, node2.id, node3.id], "new-view", { view: 1 });

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