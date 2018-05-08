import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Gossip } from "./gossip/Gossip";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
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
        const leader = new LoyalNode("leader", gossip);
        const node1 = new LoyalNode("node1", gossip);
        const node2 = new LoyalNode("node2", gossip);
        const node3 = new LoyalNode("node3", gossip);
        const node4 = new LoyalNode("node4", gossip);
        connectAllNodes([leader, node1, node2, node3, node4]);
        const block = Math.random().toString();
        leader.appendBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
        expect(node4.getLatestBlock()).to.equal(block);
    });
});