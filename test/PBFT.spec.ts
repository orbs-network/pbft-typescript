/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { BlockUtilsMock } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aPrePrepareMessage } from "./builders/MessagesBuilder";
import { aNode } from "./builders/NodeBuilder";
import { aSimpleTestNetwork, aTestNetwork } from "./builders/TestNetworkBuilder";
import { blockMatcher } from "./matchers/blockMatcher";
import { nextTick } from "./timeUtils";
import { MessageType } from "../src/networkCommunication/Messages";

chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFT", () => {
    it("should send pre-prepare only if it's the leader", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork();
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
        await nextTick();
        await blockUtils.provideNextBlock();
        await blockUtils.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted
        const preprepareCounter = (spy: sinon.SinonSpy) => {
            return spy.getCalls().filter(c => c.args[1].content.messageType === MessageType.PREPREPARE).length;
        };

        expect(preprepareCounter(spy0)).to.equal(1);
        expect(preprepareCounter(spy1)).to.equal(0);
        expect(preprepareCounter(spy2)).to.equal(0);
        expect(preprepareCounter(spy3)).to.equal(0);

        testNetwork.shutDown();
    });

    it("should start a network, append a block, and make sure that all nodes recived it", async () => {
        const { testNetwork, blockUtils, blocksPool } = aSimpleTestNetwork();

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should reach consesnsus after 5 blocks", async () => {
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4);

        testNetwork.startConsensusOnAllNodes();
        for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) {
            await nextTick();
            await blockUtils.provideNextBlock();
            await nextTick();
            await blockUtils.resolveAllValidations(true);
            await nextTick();
        }

        expect(testNetwork.nodes).to.agreeOnBlock(blockUtils.getLatestBlock());
        testNetwork.shutDown();
    });

    it("should ignore suggested block if they are not from the leader", async () => {
        const { testNetwork, blockUtils, blocksPool } = aSimpleTestNetwork();

        testNetwork.nodes[3].startConsensus(); // pretending to be the leader
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.not.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const { testNetwork, blockUtils } = aSimpleTestNetwork(4, [block1, block2]);

        const leader = testNetwork.nodes[0];
        const leaderGossip = testNetwork.getNodeGossip(leader.pk);

        // suggest block 1 to nodes 1 and 2
        leaderGossip.setOutGoingWhiteListPKs([testNetwork.nodes[1].pk, testNetwork.nodes[2].pk]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blockUtils.resolveAllValidations(true);

        // suggest block 2 to node 3.
        leaderGossip.setOutGoingWhiteListPKs([testNetwork.nodes[3].pk]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick(); // await for blockStorage.getLastBlockHash
        await blockUtils.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(await testNetwork.nodes[1].getLatestCommittedBlock()).to.equal(block1);
        expect(await testNetwork.nodes[2].getLatestCommittedBlock()).to.equal(block1);
        expect(await testNetwork.nodes[3].getLatestCommittedBlock()).to.equal(theGenesisBlock);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 5 nodes, where one of the nodes is byzantine and the others are loyal", async () => {
        const { testNetwork, blockUtils, blocksPool } = aSimpleTestNetwork(5);

        const byzantineNode = testNetwork.nodes[4];
        const gossip = testNetwork.getNodeGossip(byzantineNode.pk);
        gossip.setIncomingWhiteListPKs([]); // prevent incomming gossip messages

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes.splice(0, 3)).to.agreeOnBlock(blocksPool[0]);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", async () => {
        const { testNetwork, blockUtils, blocksPool } = aSimpleTestNetwork();
        const goodBlock = blocksPool[0];
        const fakeBlock = aBlock(theGenesisBlock);

        const byzantineNode = testNetwork.nodes[3];

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        const pks = testNetwork.gossipDiscovery.getAllGossipsPks();
        const gossip = testNetwork.getNodeGossip(byzantineNode.pk);
        gossip.multicast(pks, aPrePrepareMessage(byzantineNode.config.keyManager, 1, 0, fakeBlock));
        gossip.multicast(pks, aPrePrepareMessage(byzantineNode.config.keyManager, 1, 0, fakeBlock));
        gossip.multicast(pks, aPrePrepareMessage(byzantineNode.config.keyManager, 1, 0, fakeBlock));
        gossip.multicast(pks, aPrePrepareMessage(byzantineNode.config.keyManager, 1, 0, fakeBlock));

        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(goodBlock);
        testNetwork.shutDown();
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", async () => {
        const { testNetwork, blockUtils, blocksPool } = aSimpleTestNetwork(7);

        const byzantineNode1 = testNetwork.nodes[5];
        const byzantineNode2 = testNetwork.nodes[6];
        const gossip1 = testNetwork.getNodeGossip(byzantineNode1.pk);
        const gossip2 = testNetwork.getNodeGossip(byzantineNode2.pk);
        gossip1.setIncomingWhiteListPKs([]);
        gossip2.setIncomingWhiteListPKs([]);

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes.splice(0, 4)).to.agreeOnBlock(blocksPool[0]);
        testNetwork.shutDown();
    });

    it("should change the leader on timeout (no commits for too long)", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(block1);
        const block3 = aBlock(block1);
        const block4 = aBlock(block3);
        const { testNetwork, blockUtils, triggerElection } = aSimpleTestNetwork(4, [block1, block2, block3, block4]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        // block 1
        testNetwork.startConsensusOnAllNodes();
        await nextTick();

        // (only) node0 is the leader
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // processing block1, should be agreed by all nodes
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block1);

        // processing block 2
        await blockUtils.provideNextBlock();
        await nextTick(); // await for notifyCommitted

        triggerElection(); // force leader election before the block was verified, goes to block 3
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;
        await blockUtils.resolveAllValidations(true);

        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();
        expect(testNetwork.nodes).to.agreeOnBlock(block3);

        testNetwork.shutDown();
    });

    it("should reach consensus, on ALL nodes after one of the node was stuck (Saving future messages)", async () => {
        const block1 = aBlock(theGenesisBlock, "block 1");
        const block2 = aBlock(block1, "block 2");
        const blockUtils = new BlockUtilsMock([block1, block2]);

        const hangingBlockUtils: BlockUtilsMock = new BlockUtilsMock([block1, block2]);
        const hangingNode = aNode()
            .gettingBlocksVia(hangingBlockUtils);

        const testNetwork = aTestNetwork()
            .gettingBlocksVia(blockUtils)
            .with(3).nodes
            .withCustomNode(hangingNode)
            .build();

        // suggest block 1
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);

        // suggest block 2
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(await testNetwork.nodes[0].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[1].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[2].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[3].getLatestCommittedBlock()).to.equal(theGenesisBlock);

        // release the hanging node for block 1
        await hangingBlockUtils.resolveAllValidations(true);
        // release the hanging node for block 2
        await hangingBlockUtils.resolveAllValidations(true);

        // expect the hangking node to catch up (Saving future messages)
        expect(await testNetwork.nodes[0].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[1].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[2].getLatestCommittedBlock()).to.equal(block2);
        expect(await testNetwork.nodes[3].getLatestCommittedBlock()).to.equal(block2);

        testNetwork.shutDown();
    });
});