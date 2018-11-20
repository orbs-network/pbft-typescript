/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { MessageType } from "../src/networkCommunication/Messages";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aTestNetwork, TestNetworkBuilder } from "./builders/TestNetworkBuilder";
import { gossipMessageCounter } from "./gossip/GossipTestUtils";
import { blockMatcher } from "./matchers/blockMatcher";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFT", () => {
    it("should start a network, append a block, and make sure that all nodes recived it", async () => {
        const testNetwork = aTestNetwork();
        const firstBlock = testNetwork.blocksPool[0];

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);
        await nextTick();

        expect(testNetwork.nodes).to.agreeOnBlock(firstBlock);
        testNetwork.shutDown();
    });

    it("should send pre-prepare only if it's the leader", async () => {
        const testNetwork = aTestNetwork();
        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];
        const gossip0 = testNetwork.getNodeGossip(node0.publicKey);
        const gossip1 = testNetwork.getNodeGossip(node1.publicKey);
        const gossip2 = testNetwork.getNodeGossip(node2.publicKey);
        const gossip3 = testNetwork.getNodeGossip(node3.publicKey);
        const spy0 = sinon.spy(gossip0, "sendMessage");
        const spy1 = sinon.spy(gossip1, "sendMessage");
        const spy2 = sinon.spy(gossip2, "sendMessage");
        const spy3 = sinon.spy(gossip3, "sendMessage");

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await testNetwork.resolveAllValidations(true);
        await nextTick(); // await for notifyCommitted

        expect(gossipMessageCounter(spy0, MessageType.PREPREPARE)).to.equal(1);
        expect(gossipMessageCounter(spy1, MessageType.PREPREPARE)).to.equal(0);
        expect(gossipMessageCounter(spy2, MessageType.PREPREPARE)).to.equal(0);
        expect(gossipMessageCounter(spy3, MessageType.PREPREPARE)).to.equal(0);

        testNetwork.shutDown();
    });

    it("should reach consesnsus after 8 blocks", async () => {
        const testNetwork = aTestNetwork();

        testNetwork.startConsensusOnAllNodes();
        for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) {
            await nextTick();
            await testNetwork.provideNextBlock();
            await nextTick();
            await testNetwork.resolveAllValidations(true);
            await nextTick();
        }

        const node0 = testNetwork.nodes[0];
        expect(testNetwork.nodes).to.agreeOnBlock(node0.blockUtils.getLatestBlock());
        testNetwork.shutDown();
    });

    it("should reach consensus, on ALL nodes after one of the node was stuck (Saving future messages)", async () => {
        const block1 = aBlock(theGenesisBlock, "block 1");
        const block2 = aBlock(block1, "block 2");

        const testNetwork = new TestNetworkBuilder()
            .withBlocksPool([block1, block2])
            .with(4).nodes
            .build();

        const hangingNode = testNetwork.nodes[3];
        testNetwork.startConsensusOnAllNodes();

        // suggest block 1
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true, [hangingNode]);

        // suggest block 2
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true, [hangingNode]);
        await nextTick();

        expect(await testNetwork.nodes[0].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[1].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[2].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[3].getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);

        // release the hanging node for block 1
        await hangingNode.blockUtils.resolveAllValidations(true);
        // release the hanging node for block 2
        await hangingNode.blockUtils.resolveAllValidations(true);

        // expect the hangking node to catch up (Saving future messages)
        expect(await testNetwork.nodes[0].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[1].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[2].getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await testNetwork.nodes[3].getLatestCommittedBlock()).to.deep.equal(block2);

        testNetwork.shutDown();
    });
});