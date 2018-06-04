import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { SilentLogger } from "./logger/SilentLogger";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Byzantine Attacks", () => {
    it("should ignore preprepare messages pretend to be me", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const leaderBuilder = aNode().storingOn(inspectedStorage);
        const block = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block]).withCustomeNode(leaderBuilder).with(3).nodes.build();

        const leader = network.nodes[0];
        const term = 0;
        const view = 0;
        leader.pbft.gossip.unicast(leader.id, leader.id, "preprepare", { block, view, term });
        await nextTick();

        expect(inspectedStorage.getPrepare(term, view).length).to.equal(0);
        network.shutDown();
    });

    it("should ignore prepare messages pretend to be me", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const leaderNodeBuilder = aNode().storingOn(inspectedStorage);
        const block = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block]).withCustomeNode(leaderNodeBuilder).with(3).nodes.build();

        const leader = network.nodes[0];
        network.processNextBlock();
        await nextTick();

        const byzantineNode = network.nodes[3];
        const term = 0;
        const view = 0;
        byzantineNode.pbft.gossip.unicast(leader.id, leader.id, "prepare", { blockHash: block.hash, view, term });
        await nextTick();

        expect(inspectedStorage.getPrepare(term, view).length).to.equal(3);
        network.shutDown();
    });

    it("should ignore prepare that came from the leader, we count the leader only on the preprepare", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const nodeBuilder = aNode().storingOn(inspectedStorage);
        const block = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block]).with(3).nodes.withCustomeNode(nodeBuilder).build();

        const leader = network.nodes[0];
        const node = network.nodes[1];
        leader.pbft.gossip.unicast(leader.id, node.id, "prepare", { blockHash: block.hash, view: 0, term: 0 });
        leader.pbft.gossip.unicast(leader.id, node.id, "preprepare", { block, view: 0, term: 0 });
        await nextTick();

        expect(node.getLatestBlock()).to.not.deep.equal(block);
        network.shutDown();
    });

    it("Leader suggests 2 blocks that points to the previous block at the same time", async () => {
        // We have nodes 0, 1, 2, 3.

        // * 0 is a byzantine leader
        // * 0 sends PP (B1) to nodes 1 and 2. B1 is pointing to the previous block.
        // * nodes 1 and 2 hang on validation
        // * 0 sends PP (B2) to nodes 2 and 3. B2 is pointing to the previous block.
        // * there's a consensus on B2.
        // * validation is complete, nodes 1 and 2 continue.
        // * there's another consensus on B1.
        // * we use term to solve this
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.build();

        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const leaderGossip = leader.pbft.gossip as InMemoryGossip;
        leaderGossip.setOutGoingWhiteList([node1.id, node2.id]);
        network.processNextBlock();
        await nextTick();

        leaderGossip.setOutGoingWhiteList([node2.id, node3.id]);
        network.processNextBlock();
        await nextTick();

        expect(node1.getLatestBlock()).to.equal(block1);
        expect(node2.getLatestBlock()).to.equal(block1);
        expect(node3.getLatestBlock()).to.not.equal(block1);
        expect(node3.getLatestBlock()).to.not.equal(block2);
        network.shutDown();
    });

    it("A scenario where a node should not get committed on a block without the commit phase", async () => {
        // We have nodes 1, 2, 3, 4. we're going to get node 3 to be committed on block B

        // * 1 is the leader
        // * 1 sends PP[B] to 2, 3 and 4
        // * 3 receives PP[B] from 1, and P[B] from 2. the node is prepared.
        // * node 2 and 4 are not prepared.
        // * Election is triggered, and node 2 is the new leader.
        // * 2 (The new leader) is constructing a new block B2 and sends PP[B2] to 1, 3 and 4.
        // * 3 rejects the block (Already prepared on B)
        // * 2, 1, and 4 accepts the new block B2
        // * we have a fork!
        //
        // [V] 1: PP[B] => 2
        // [V] 1: PP[B] => 3
        // [X] 1: PP[B] => 4
        //
        // [X] 2: P[B] => 1
        // [V] 2: P[B] => 3
        // [X] 2: P[B] => 4
        //
        // [X] 3: P[B] => 1
        // [X] 3: P[B] => 2
        // [X] 3: P[B] => 4
        //
        // [X] 4: P[B] => 1
        // [X] 4: P[B] => 2
        // [X] 4: P[B] => 3

        const electionTrigger = new ElectionTriggerMock();
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(theGenesisBlock, "block2");
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.electingLeaderUsing(electionTrigger).build();

        const node1 = network.nodes[0]; // leader
        const node2 = network.nodes[1];
        const node3 = network.nodes[2];
        const node4 = network.nodes[3];

        const gossip1 = node1.pbft.gossip as InMemoryGossip;
        const gossip2 = node2.pbft.gossip as InMemoryGossip;
        const gossip3 = node3.pbft.gossip as InMemoryGossip;
        const gossip4 = node4.pbft.gossip as InMemoryGossip;

        gossip1.setOutGoingWhiteList([node2.id, node3.id]);
        gossip2.setOutGoingWhiteList([node3.id]);
        gossip3.setOutGoingWhiteList([]);
        gossip4.setOutGoingWhiteList([]);

        network.processNextBlock();
        await nextTick();

        expect(node1.getLatestBlock()).to.be.undefined;
        expect(node2.getLatestBlock()).to.be.undefined;
        expect(node3.getLatestBlock()).to.be.undefined;
        expect(node4.getLatestBlock()).to.be.undefined;

        gossip1.clearOutGoingWhiteList();
        gossip2.clearOutGoingWhiteList();
        gossip3.clearOutGoingWhiteList();
        gossip4.clearOutGoingWhiteList();

        gossip2.setIncomingWhiteList([]);

        // elect node2 as the leader
        electionTrigger.trigger();
        network.processNextBlock();
        await nextTick();

        expect(node1.getLatestBlock()).to.equal(block2);
        expect(node2.getLatestBlock()).to.be.undefined;
        expect(node3.getLatestBlock()).to.equal(block2);
        expect(node4.getLatestBlock()).to.equal(block2);

        network.shutDown();
    });
});