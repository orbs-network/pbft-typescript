/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { blockMatcher } from "./matchers/blockMatcher";
import { NodeMock } from "./network/NodeMock";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFT", () => {
    it("should send pre-prepare only if it's the leader", async () => {
        const block = aBlock(theGenesisBlock);
        const network = aNetwork()
            .blocksInPool([block])
            .with(4).nodes
            .build();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];
        const spy0 = sinon.spy(node0.pbft.gossip, "multicast");
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "multicast");
        const spy3 = sinon.spy(node3.pbft.gossip, "multicast");

        await network.processNextBlock();
        const preprepareCounter = (spy: sinon.SinonSpy) => spy.getCalls().filter(c => c.args[2] === "preprepare").length;

        expect(preprepareCounter(spy0)).to.equal(1);
        expect(preprepareCounter(spy1)).to.equal(0);
        expect(preprepareCounter(spy2)).to.equal(0);
        expect(preprepareCounter(spy3)).to.equal(0);

        network.shutDown();
    });

    it("should start a network, append a block, and make sure that all nodes recived it", async () => {
        const block = aBlock(theGenesisBlock, "block content");
        const network = aNetwork().blocksInPool([block]).with(4).nodes.build();

        await network.processNextBlock();

        expect(network.nodes).to.agreeOnBlock(block);
        network.shutDown();
    });

    it("should ignore suggested block if they are not from the leader", async () => {
        const block = aBlock(theGenesisBlock, "block1");
        const network = aNetwork().blocksInPool([block]).with(4).nodes.build();

        const byzantineNode = network.nodes[3];
        await byzantineNode.processNextBlock();

        expect(network.nodes).to.not.agreeOnBlock(block);
        network.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", async () => {
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(theGenesisBlock, "block2");
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.build();

        const leader = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        const leaderGossip = leader.pbft.gossip as InMemoryGossip;

        // suggest block 1 to nodes 1 and 2
        leaderGossip.setOutGoingWhiteList([node1.id, node2.id]);
        await network.processNextBlock();

        // suggest block 2 to node 3.
        leaderGossip.setOutGoingWhiteList([node3.id]);
        await network.processNextBlock();

        expect(node1.getLatestBlock()).to.equal(block1);
        expect(node2.getLatestBlock()).to.equal(block1);
        expect(node3.getLatestBlock()).to.be.undefined;
        network.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where one of the nodes is byzantine and the others are loyal", async () => {
        const block = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block]).with(5).nodes.build();

        const leader = network.nodes[0];
        const byzantineNode = network.nodes[4];
        const gossip = byzantineNode.pbft.gossip as InMemoryGossip;
        gossip.setIncomingWhiteList([]);

        await network.processNextBlock();

        expect(network.nodes.splice(0, 2)).to.agreeOnBlock(block);
        network.shutDown();
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", async () => {
        const goodBlock = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([goodBlock]).with(4).nodes.build();

        const byzantineNode = network.nodes[3];

        await network.processNextBlock();

        const fakeBlock = aBlock(theGenesisBlock);
        const gossip = byzantineNode.pbft.gossip;
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        await nextTick();

        expect(network.nodes).to.agreeOnBlock(goodBlock);
        network.shutDown();
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", async () => {
        const block = aBlock(theGenesisBlock);
        const network = aNetwork().blocksInPool([block]).with(7).nodes.build();

        const byzantineNode1 = network.nodes[5];
        const byzantineNode2 = network.nodes[6];
        const gossip1 = byzantineNode1.pbft.gossip as InMemoryGossip;
        const gossip2 = byzantineNode2.pbft.gossip as InMemoryGossip;
        gossip1.setIncomingWhiteList([]);
        gossip2.setIncomingWhiteList([]);
        await network.processNextBlock();

        expect(network.nodes.splice(0, 4)).to.agreeOnBlock(block);
        network.shutDown();
    });

    it("should fire onNewBlock only once per block, even if there were more confirmations", async () => {
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(block1, "block2");
        const network = aNetwork().blocksInPool([block1, block2]).with(4).nodes.build();

        const leader = network.nodes[0];
        const node = network.nodes[1] as NodeMock;
        await network.processNextBlock();
        await network.processNextBlock();

        expect(node.blockLog.length).to.equal(2);
        network.shutDown();
    });

    it("should not accept a block if it is not pointing to the previous block", async () => {
        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        const network = aNetwork().blocksInPool([block1, notInOrderBlock]).with(4).nodes.build();

        await network.processNextBlock();
        await network.processNextBlock();

        expect(network.nodes).to.agreeOnBlock(block1);
        network.shutDown();
    });

    it("should change the leader on timeout (no commits for too long)", async () => {
        const validator: BlocksValidatorMock = new BlocksValidatorMock(false);
        const electionTriggerList: Array<ElectionTriggerMock> = [];
        const electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTriggerList.push(t);
            return t;
        };
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const block4 = aBlock(block3, "Block4");
        const network = aNetwork()
            .blocksInPool([block1, block2, block3, block4])
            .with(4)
            .nodes
            .validateUsing(validator)
            .electingLeaderUsing(electionTriggerFactory)
            .build();

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        await network.processNextBlock(); // block 1
        validator.resolve();
        await nextTick();
        expect(network.nodes).to.agreeOnBlock(block1);

        await network.processNextBlock(); // block 2
        electionTriggerList.map(t => t.trigger()); // force leader election before the block was verified, goes to block 3
        validator.resolve();
        await nextTick();

        validator.resolve();
        await nextTick();

        expect(network.nodes).to.agreeOnBlock(block3);
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // TODO: this step will not pass because we're not waiting for all the nodes to get initialized.
        // once we have this mechanism implemented, uncomment this part (And add a separate test)
        // network.processNextBlock();
        // await nextTick();
        // expect(network.nodes).to.agreeOnBlock(block4);

        network.shutDown();
    });
});