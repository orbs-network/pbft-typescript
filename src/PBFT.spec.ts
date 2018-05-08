import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { ByzantineNode } from "./nodes/ByzantineNode";
import { LoyalNode } from "./nodes/LoyalNode";
import { Node } from "./nodes/Node";

chai.use(sinonChai);

//////////////
// Missing tests:
// * Don't get onNewBlock more than once per block
// * Nodes can send the same node several times, causing others to count it as another vote
// * Nodes can pretend to be other nodes
//////////////

describe("PBFT", () => {
    function connectAllNodes(nodes: Node[]): void {
        nodes.map(nodeA => {
            nodes.map(nodeB => {
                if (nodeA !== nodeB) {
                    (nodeA.gossip as InMemoryGossip).registerRemoteMessagesListener(nodeB.publicKey, nodeB.gossip as InMemoryGossip);
                }
            });
        });
    }

    it("should start a network, append a block, and make sure that all nodes recived it", () => {
        const leader = new LoyalNode(5, "leader");
        const node1 = new LoyalNode(5, "node1");
        const node2 = new LoyalNode(5, "node2");
        const node3 = new LoyalNode(5, "node3");
        const node4 = new LoyalNode(5, "node4");
        connectAllNodes([leader, node1, node2, node3, node4]);
        const block = Math.random().toString();
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
        expect(node4.getLatestBlock()).to.equal(block);
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", () => {
        const leader = new ByzantineNode(4, "leader");
        const node1 = new LoyalNode(4, "node1");
        const node2 = new LoyalNode(4, "node2");
        const node3 = new LoyalNode(4, "node3");
        connectAllNodes([leader, node1, node2, node3]);

        const block1 = Math.random().toString();
        const block2 = Math.random().toString();
        leader.suggestBlockTo(block2, node2, node3);
        leader.suggestBlockTo(block1, node1);

        expect(node1.getLatestBlock()).to.equal(block2);
        expect(node2.getLatestBlock()).to.equal(block2);
        expect(node3.getLatestBlock()).to.equal(block2);
    });

    it("should reach consensus, in a network of 4 nodes, where one of the nodes is byzantine and the others are loyal", () => {
        const leader = new LoyalNode(4, "leader");
        const node1 = new LoyalNode(4, "node1");
        const node2 = new LoyalNode(4, "node2");
        const node3 = new ByzantineNode(4, "node3");
        connectAllNodes([leader, node1, node2, node3]);

        const block = Math.random().toString();
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", () => {
        const leader = new LoyalNode(4, "leader");
        const node1 = new LoyalNode(4, "node1");
        const node2 = new LoyalNode(4, "node2");
        const node3 = new ByzantineNode(4, "node3");
        connectAllNodes([leader, node1, node2, node3]);

        const block = Math.random().toString();
        const badBlock = Math.random().toString();
        leader.suggestBlock(block);
        node3.suggestBlockTo(badBlock, node1);
        node3.suggestBlockTo(badBlock, node1);
        node3.suggestBlockTo(badBlock, node1);
        node3.suggestBlockTo(badBlock, node1);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", () => {
        const leader = new LoyalNode(7, "leader");
        const node1 = new LoyalNode(7, "node1");
        const node2 = new LoyalNode(7, "node2");
        const node3 = new LoyalNode(7, "node3");
        const node4 = new LoyalNode(7, "node4");
        const node5 = new ByzantineNode(7, "node5");
        const node6 = new ByzantineNode(7, "node6");
        connectAllNodes([leader, node1, node2, node3, node4, node5, node6]);

        const block = Math.random().toString();
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
        expect(node4.getLatestBlock()).to.equal(block);
    });
});