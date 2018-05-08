import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Gossip } from "./gossip/Gossip";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { ByzantineNode } from "./nodes/ByzantineNode";
import { LoyalNode } from "./nodes/LoyalNode";
import { Node } from "./nodes/Node";

chai.use(sinonChai);

describe("PBFT", () => {
    function connectAllNodes(nodes: Node[]): void {
        nodes.map(nodeA => {
            nodes.map(nodeB => {
                if (nodeA !== nodeB) {
                    (nodeB.gossip as InMemoryGossip).registerRemoteMessagesListener(nodeA.id, nodeA.gossip as InMemoryGossip);
                }
            });
        });
    }

    it("should start a network, append a block, and make sure that all nodes recived it", () => {
        const gossip: Gossip = new InMemoryGossip();
        const leader = new LoyalNode(5, "leader", gossip);
        const node1 = new LoyalNode(5, "node1", gossip);
        const node2 = new LoyalNode(5, "node2", gossip);
        const node3 = new LoyalNode(5, "node3", gossip);
        const node4 = new LoyalNode(5, "node4", gossip);
        connectAllNodes([leader, node1, node2, node3, node4]);
        const block = Math.random().toString();
        leader.appendBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
        expect(node4.getLatestBlock()).to.equal(block);
    });

    it("should reach consensus, the leader is byzantine the other 3 nodes are loyal", () => {
        const gossip: Gossip = new InMemoryGossip();
        const leader = new ByzantineNode(4, "leader", gossip);
        const node1 = new LoyalNode(4, "node1", gossip);
        const node2 = new LoyalNode(4, "node2", gossip);
        const node3 = new LoyalNode(4, "node3", gossip);
        connectAllNodes([leader, node1, node2, node3]);

        const block1 = Math.random().toString();
        const block2 = Math.random().toString();
        leader.appendBlockTo(block2, node2, node3);
        leader.appendBlockTo(block1, node1);

        expect(node1.getLatestBlock()).to.equal(block2);
        expect(node2.getLatestBlock()).to.equal(block2);
        expect(node3.getLatestBlock()).to.equal(block2);
    });
});