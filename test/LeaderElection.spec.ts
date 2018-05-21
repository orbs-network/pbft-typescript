import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aNetwork } from "./builders/NetworkBuilder";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { wait } from "./timeUtils";
chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();
        const node1 = network.nodes[0];
        const nextLeader = network.nodes[1];

        const unicastSpy = sinon.spy(node1.gossip, "unicast");
        await wait(500);
        expect(unicastSpy).to.have.been.calledWith(nextLeader.publicKey, "view-change", { newView: 1 });
        network.shutDown();
    });

    it("should cycle to the first node when the current leader is the last node", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(1).loyalNodes.build();
        const node1 = network.nodes[0];
        const node2 = network.nodes[1];

        const unicastSpy = sinon.spy(node2.gossip, "unicast");
        await wait(700);
        expect(unicastSpy).to.have.been.calledWith(node1.publicKey, "view-change", { newView: 2 });
        network.shutDown();
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage(node0.publicKey, "view-change", { newView: 1 });
        gossip.onRemoteMessage(node2.publicKey, "view-change", { newView: 1 });
        gossip.onRemoteMessage(node3.publicKey, "view-change", { newView: 1 });
        expect(broadcastSpy).to.have.been.calledWith("new-view", { view: 1 });
        network.shutDown();
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", leader.publicKey, { newView: 1 });
        gossip.onRemoteMessage("view-change", node2.publicKey, { newView: 1 });
        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });

    it("should not count view-change votes from the same node", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];

        const gossip = node1.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", leader.publicKey, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.publicKey, { newView: 1 });
        gossip.onRemoteMessage("view-change", leader.publicKey, { newView: 1 });
        expect(broadcastSpy).to.not.have.been.called;
        network.shutDown();
    });
});