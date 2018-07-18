/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { Gossip } from "./gossip/Gossip";
import { blockMatcher } from "./matchers/blockMatcher";
import { nextTick } from "./timeUtils";
import { aPayload } from "./builders/PayloadBuilder";

chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFT", () => {
    it("should send pre-prepare only if it's the leader", async () => {
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];
        const gossip0 = testNetwork.getNodeGossip(node0.pk);
        const gossip1 = testNetwork.getNodeGossip(node1.pk);
        const gossip2 = testNetwork.getNodeGossip(node2.pk);
        const gossip3 = testNetwork.getNodeGossip(node3.pk);
        const spy0 = sinon.spy(gossip0, "multicast");
        const spy1 = sinon.spy(gossip1, "multicast");
        const spy2 = sinon.spy(gossip2, "multicast");
        const spy3 = sinon.spy(gossip3, "multicast");

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted
        const preprepareCounter = (spy: sinon.SinonSpy) => spy.getCalls().filter(c => c.args[1] === "preprepare").length;

        expect(preprepareCounter(spy0)).to.equal(1);
        expect(preprepareCounter(spy1)).to.equal(0);
        expect(preprepareCounter(spy2)).to.equal(0);
        expect(preprepareCounter(spy3)).to.equal(0);

        testNetwork.shutDown();
    });

    it("should start a network, append a block, and make sure that all nodes recived it", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork();

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should ignore suggested block if they are not from the leader", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork();

        testNetwork.nodes[3].startConsensus(); // pretending to be the leader
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.not.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork(4, [block1, block2]);

        const leader = testNetwork.nodes[0];
        const leaderGossip = testNetwork.getNodeGossip(leader.pk);

        // suggest block 1 to nodes 1 and 2
        leaderGossip.setOutGoingWhiteListPKs([testNetwork.nodes[1].pk, testNetwork.nodes[2].pk]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blocksValidator.resolveAllValidations(true);

        // suggest block 2 to node 3.
        leaderGossip.setOutGoingWhiteListPKs([testNetwork.nodes[3].pk]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blocksValidator.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(await testNetwork.nodes[1].getLatestBlock()).to.equal(block1);
        expect(await testNetwork.nodes[2].getLatestBlock()).to.equal(block1);
        expect(await testNetwork.nodes[3].getLatestBlock()).to.equal(theGenesisBlock);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 5 nodes, where one of the nodes is byzantine and the others are loyal", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork(5);

        const byzantineNode = testNetwork.nodes[4];
        const gossip = testNetwork.getNodeGossip(byzantineNode.pk);
        gossip.setIncomingWhiteListPKs([]); // prevent any income gossip messages

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes.splice(0, 3)).to.agreeOnBlock(blocksPool[0]);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork();
        const goodBlock = blocksPool[0];
        const fakeBlock = aBlock(theGenesisBlock);

        const byzantineNode = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        const gossip = testNetwork.getNodeGossip(byzantineNode.pk);
        gossip.broadcast("preprepare", aPayload(byzantineNode.pk, { block: fakeBlock, view: 0, term: 1 }));
        gossip.broadcast("preprepare", aPayload(byzantineNode.pk, { block: fakeBlock, view: 0, term: 1 }));
        gossip.broadcast("preprepare", aPayload(byzantineNode.pk, { block: fakeBlock, view: 0, term: 1 }));
        gossip.broadcast("preprepare", aPayload(byzantineNode.pk, { block: fakeBlock, view: 0, term: 1 }));

        await nextTick();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(goodBlock);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork(7);

        const byzantineNode1 = testNetwork.nodes[5];
        const byzantineNode2 = testNetwork.nodes[6];
        const gossip1 = testNetwork.getNodeGossip(byzantineNode1.pk);
        const gossip2 = testNetwork.getNodeGossip(byzantineNode2.pk);
        gossip1.setIncomingWhiteListPKs([]);
        gossip2.setIncomingWhiteListPKs([]);

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes.splice(0, 4)).to.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should not accept a block if it is not pointing to the previous block", async () => {
        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        const { testNetwork, blocksProvider, blocksValidator } = aSimpleTestNetwork(4, [block1, notInOrderBlock]);

        // block 1
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);

        // not in otder block
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);


        expect(testNetwork.nodes).to.agreeOnBlock(block1);
        testNetwork.shutDown();
    });

    it("should not process gossip messages after dispose", async () => {
        const { testNetwork, blocksProvider, blocksValidator, blocksPool } = aSimpleTestNetwork();

        // block 1
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(testNetwork.nodes).to.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();

        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];
        const gossip1 = testNetwork.getNodeGossip(node1.pk);
        const gossip2 = testNetwork.getNodeGossip(node2.pk);
        const gossip3 = testNetwork.getNodeGossip(node3.pk);
        const spy1 = sinon.spy(gossip1, "multicast");
        const spy2 = sinon.spy(gossip2, "multicast");
        const spy3 = sinon.spy(gossip3, "multicast");

        // block 2 (After network shutdown)
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(spy1).to.not.have.been.called;
        expect(spy2).to.not.have.been.called;
        expect(spy3).to.not.have.been.called;
    });

    it("should change the leader on timeout (no commits for too long)", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const block4 = aBlock(block3);
        const { testNetwork, blocksProvider, blocksValidator, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3, block4]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        // block 1
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();

        // (only) node0 is the leader
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // processing block1, should be agreed by all nodes
        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block1);

        // processing block 2
        await blocksProvider.provideNextBlock();
        await nextTick(); // await for notifyCommitted

        triggerElection(); // force leader election before the block was verified, goes to block 3
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;
        await blocksValidator.resolveAllValidations(true);

        await blocksProvider.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block3);

        testNetwork.shutDown();
    });
});