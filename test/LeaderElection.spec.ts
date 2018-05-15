import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Config } from "../src/Config";
import { PBFT } from "../src/PBFT";
import { theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { wait } from "./timeUtils";

chai.use(sinonChai);

describe("Leader Election", () => {
    it("should notify the next leader when the timeout expired", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();
        const node1 = network.nodes[0];
        const nextLeader = network.nodes[1];

        const unicastSpy = sinon.spy(node1.gossip, "unicast");
        await wait(500);
        expect(unicastSpy).to.have.been.calledWith(nextLeader.publicKey, "view-change", { newView: 1, senderPublicKey: node1.publicKey });
    });

    it("should cycle to the first node when the current leader is the last node", async () => {
        const network = aNetwork().with().loyalLeader().with(1).loyalNodes().build();
        const node1 = network.nodes[0];
        const node2 = network.nodes[1];

        const unicastSpy = sinon.spy(node2.gossip, "unicast");
        await wait(700);
        expect(unicastSpy).to.have.been.calledWith(node1.publicKey, "view-change", { newView: 2, senderPublicKey: node2.publicKey });
    });

    it("should count 2f+1 view-change to be elected", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: node0.publicKey });
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: node2.publicKey });
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: node3.publicKey });
        expect(broadcastSpy).to.have.been.calledWith("new-view", { view: 1 });
    });

    it("should not fire new-view if count of view-change is less than 2f+1", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const gossip = node1.gossip as InMemoryGossip;
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: leader.publicKey });
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: node2.publicKey });
        expect(broadcastSpy).to.not.have.been.called;
    });

    it("should not count view-change votes from the same node", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();
        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const gossip = new InMemoryGossip();
        const config: Config = {
            genesisBlockHash: theGenesisBlock.hash,
            publicKey: Math.random().toString(),
            network: network,
            gossip: gossip,
            onNewBlock: () => { }
        };

        const pbft: PBFT = new PBFT(config);
        const broadcastSpy = sinon.spy(gossip, "broadcast");
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: leader.publicKey });
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: leader.publicKey });
        gossip.onRemoteMessage("view-change", { newView: 1, senderPublicKey: leader.publicKey });
        expect(broadcastSpy).to.not.have.been.called;
    });
});