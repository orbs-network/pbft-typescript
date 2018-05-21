/// <reference path="./matchers/consensusMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { consensusMatcher } from "./matchers/consensusMatcher";
import { ByzantineNode } from "./network/ByzantineNode";
import { LoyalNode } from "./network/LoyalNode";
import { every, wait } from "./timeUtils";

chai.use(sinonChai);
chai.use(consensusMatcher);

//////////////
// Todos:
// * refactor the way config is constructed and passed to pbft
// * timeout should be configurable
// *
// * Nodes should not broadcast prepare if it's not the same term (To avoid DDosig the system)
// * Nodes can pretend to be other nodes => use sig
// * Unsubscribe gossip on dispose of PBFT
// * timeouts should trigger leader election
// * Should I use senderPublicKey or view?
// * Why do we need the term
// * should call validate(block) on onPreprepare
// * Do we have to sign the message type as well? is it a must?
// * Currently the prepare logs are using the blockHash and senderPublicKey, convert it to v & r.
//////////////

describe("PBFT", () => {
    it("should start a network, append a block, and make sure that all nodes recived it", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const block = aBlock(theGenesisBlock, "block content");
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
        network.shutDown();
    });

    it("should ignore suggested block if they are not from the leader", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(2).loyalNodes.with(1).byzantineNodes.build();

        const block = aBlock(theGenesisBlock);
        const byzantineNode = network.nodes[3];
        byzantineNode.suggestBlock(block);

        expect(network).to.not.reachConsensusOnBlock(block);
        network.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", () => {
        const network = aNetwork().leadBy.a.byzantineLeader.with(3).loyalNodes.build();

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
        network.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where one of the nodes is byzantine and the others are loyal", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.with(1).byzantineNodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
        network.shutDown();
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(2).loyalNodes.with(1).byzantineNodes.build();

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
        network.shutDown();
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(4).loyalNodes.with(2).byzantineNodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        leader.suggestBlock(block);

        expect(network).to.reachConsensusOnBlock(block);
        network.shutDown();
    });

    it("should fire onNewBlock only once per block, even if there were more confirmations", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const leader = network.nodes[0];
        const node = network.nodes[1] as LoyalNode;
        leader.suggestBlock(block1);
        leader.suggestBlock(block2);

        expect(node.blockLog.length).to.equal(2);
        network.shutDown();
    });

    it("should not accept a block if it is not pointing to the previous block", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        const leader = network.nodes[0];
        leader.suggestBlock(block1);
        leader.suggestBlock(notInOrderBlock);

        expect(network).to.reachConsensusOnBlock(block1);
        network.shutDown();
    });

    it("should change the leader on timeout (no commits for too long)", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        expect(leader.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // leader is not sending a block, we time out, and node1 should be the leader
        await wait(40);

        let currentBlock = theGenesisBlock;
        await every(10, 2, () => {
            currentBlock = aBlock(currentBlock);
            node1.suggestBlock(currentBlock);
        });

        expect(leader.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;
        network.shutDown();
    });
});