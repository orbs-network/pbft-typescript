import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./BlockBuilder";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { ByzantineNode } from "./nodes/ByzantineNode";
import { LoyalNode } from "./nodes/LoyalNode";
import { Network } from "./nodes/Network";
import { Node } from "./nodes/Node";
chai.use(sinonChai);

//////////////
// Todos:
// * Add logs
// * Nodes can pretend to be other nodes => use sig
//
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
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new LoyalNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block = aBlock(theGenesisBlock, "block content");
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
    });

    it("should ignore suggested block if they are not from the leader", () => {
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new ByzantineNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block = aBlock(theGenesisBlock);
        node3.suggestBlock(block);

        expect(leader.getLatestBlock()).to.be.undefined;
        expect(node1.getLatestBlock()).to.be.undefined;
        expect(node2.getLatestBlock()).to.be.undefined;
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", () => {
        const network = new Network();
        const leader = new ByzantineNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new LoyalNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(theGenesisBlock, "block2");
        leader.suggestBlockTo(block1, node1, node2);
        leader.suggestBlockTo(block2, node3);

        expect(node1.getLatestBlock()).to.equal(block1);
        expect(node2.getLatestBlock()).to.equal(block1);
        expect(node3.getLatestBlock()).to.be.undefined;
    });

    it("should reach consensus, in a network of 4 nodes, where one of the nodes is byzantine and the others are loyal", () => {
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new ByzantineNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block = aBlock(theGenesisBlock);
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", () => {
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new ByzantineNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block = aBlock(theGenesisBlock);
        const badBlock = aBlock(theGenesisBlock);
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
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new LoyalNode(network, "node3");
        const node4 = new LoyalNode(network, "node4");
        const node5 = new ByzantineNode(network, "node5");
        const node6 = new ByzantineNode(network, "node6");
        network.registerNodes([leader, node1, node2, node3, node4, node5, node6]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3, node4, node5, node6]);

        const block = aBlock(theGenesisBlock);
        leader.suggestBlock(block);

        expect(leader.getLatestBlock()).to.equal(block);
        expect(node1.getLatestBlock()).to.equal(block);
        expect(node2.getLatestBlock()).to.equal(block);
        expect(node3.getLatestBlock()).to.equal(block);
        expect(node4.getLatestBlock()).to.equal(block);
    });

    it("should fire onNewBlock only once per block, even if there were more confirmations", () => {
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new LoyalNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        leader.suggestBlock(block1);
        leader.suggestBlock(block2);

        expect(node1.blockLog.length).to.equal(2);
    });

    it("should not accept a block if it is not pointing to the previous block", () => {
        const network = new Network();
        const leader = new LoyalNode(network, "leader");
        const node1 = new LoyalNode(network, "node1");
        const node2 = new LoyalNode(network, "node2");
        const node3 = new LoyalNode(network, "node3");
        network.registerNodes([leader, node1, node2, node3]);
        network.initAllNodes();
        connectAllNodes([leader, node1, node2, node3]);

        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        leader.suggestBlock(block1);
        leader.suggestBlock(notInOrderBlock);

        expect(node1.getLatestBlock().hash).to.equal(block1.hash);
        expect(node2.getLatestBlock().hash).to.equal(block1.hash);
        expect(node3.getLatestBlock().hash).to.equal(block1.hash);
    });
});