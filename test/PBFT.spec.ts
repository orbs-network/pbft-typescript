/// <reference path="./matchers/consensusMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./BlockBuilder";
import { aNetwork } from "./NetworkBuilder";
import { consensusMatcher } from "./matchers/consensusMatcher";
import { ByzantineNode } from "./network/ByzantineNode";
import { LoyalNode } from "./network/LoyalNode";
import { every, wait } from "./timeUtils";

chai.use(sinonChai);
chai.use(consensusMatcher);

//////////////
// Todos:
// * Nodes can pretend to be other nodes => use sig
// * timeouts should trigger leader election
// * Should I use senderPublicKey or view?
// * Why do we need the term
//////////////

describe("PBFT", () => {
    it("should start a network, append a block, and make sure that all nodes recived it", () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const block = aBlock(theGenesisBlock, "block content");
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
    });

    it("should ignore suggested block if they are not from the leader", () => {
        const network = aNetwork().with().loyalLeader().with(2).loyalNodes().with(1).byzantineNodes().build();

        const block = aBlock(theGenesisBlock);
        const byzantineNode = network.nodes[3];
        byzantineNode.suggestBlock(block);

        expect(network).to.not.reachConsensusOnBlock(block);
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", () => {
        const network = aNetwork().with().byzantineLeader().with(3).loyalNodes().build();

        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(theGenesisBlock, "block2");
        const leader = network.nodes[0] as ByzantineNode;
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];
        leader.suggestBlockTo(block1, node1, node2);
        leader.suggestBlockTo(block2, node3);

        expect(node1.getLatestBlock()).to.equal(block1);
        expect(node2.getLatestBlock()).to.equal(block1);
        expect(node3.getLatestBlock()).to.be.undefined;
    });

    it("should reach consensus, in a network of 4 nodes, where one of the nodes is byzantine and the others are loyal", () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().with(1).byzantineNodes().build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", () => {
        const network = aNetwork().with().loyalLeader().with(2).loyalNodes().with(1).byzantineNodes().build();

        const leader = network.nodes[0];
        const loyalNode = network.nodes[1];
        const byzantineNode = network.nodes[3] as ByzantineNode;

        const goodBlock = aBlock(theGenesisBlock);
        const badBlock = aBlock(theGenesisBlock);
        leader.suggestBlock(goodBlock);
        byzantineNode.suggestBlockTo(badBlock, loyalNode);
        byzantineNode.suggestBlockTo(badBlock, loyalNode);
        byzantineNode.suggestBlockTo(badBlock, loyalNode);
        byzantineNode.suggestBlockTo(badBlock, loyalNode);

        expect(network).to.reachConsensusOnBlock(goodBlock);
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", () => {
        const network = aNetwork().with().loyalLeader().with(4).loyalNodes().with(2).byzantineNodes().build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
    });

    it("should fire onNewBlock only once per block, even if there were more confirmations", () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const leader = network.nodes[0];
        const node = network.nodes[1] as LoyalNode;
        leader.suggestBlock(block1);
        leader.suggestBlock(block2);

        expect(node.blockLog.length).to.equal(2);
    });

    it("should not accept a block if it is not pointing to the previous block", () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        const leader = network.nodes[0];
        leader.suggestBlock(block1);
        leader.suggestBlock(notInOrderBlock);

        expect(network).to.reachConsensusOnBlock(block1);
    });

    it("should change the leader on timeout (no commits for too long)", (done) => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        expect(leader.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // leader is not sending a block, we time out, and node1 should be the leader
        let currentBlock = theGenesisBlock;
        const stop = every(100, 400, () => {
            currentBlock = aBlock(currentBlock);
            node1.suggestBlock(currentBlock);
        });

        wait(700).then(() => {
            stop();
            expect(leader.isLeader()).to.be.false;
            expect(node1.isLeader()).to.be.true;
            expect(node2.isLeader()).to.be.false;
            expect(node3.isLeader()).to.be.false;
            done();
        });
    });
});