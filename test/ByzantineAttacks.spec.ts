import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { CommitMessage, PrepareMessage, PrePrepareMessage } from "../src/networkCommunication/Messages";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aCommitMessage, aPrepareMessage, aPrePrepareMessage } from "./builders/MessagesBuilder";
import { aTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { messageToGossip } from "./gossip/GossipTestUtils";

chai.use(sinonChai);

describe("Byzantine Attacks", () => {
    it("Block validation is completed after new election, old validation should be ignored", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const testNetwork = aTestNetwork(4, [block1, block2]);

        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const leaderGossip = testNetwork.getNodeGossip(leader.publicKey);
        leaderGossip.setOutGoingWhiteListPKs([node1.publicKey, node2.publicKey]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();

        node1.triggerElection();
        node2.triggerElection();
        node3.triggerElection();

        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);

        expect(await node1.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node2.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.deep.equal(block2);
        testNetwork.shutDown();
    });

    it("A scenario where a node should not get committed on a block without the commit phase", async () => {
        // We have nodes 0, 1, 2, 3. we're going to get node 2 to be committed on block B

        // * 0 is the leader
        // * 0 sends PP[B] to 1, 2 and 3
        // * node 1 receives PP[B] from 0, and sends P[B] to 0, 2, and 3.
        // * node 2 receives PP[B] from 0, and P[B] from 1.
        // * node 3 doesn't receives anything (network issue)
        // * node 1 and 3 are not prepared.
        // * node 2 is prepared.
        //
        // [V] 0: PP[B] => 1
        // [V] 0: PP[B] => 2
        // [X] 0: PP[B] => 3
        //
        // [X] 1: P[B] => 0
        // [V] 1: P[B] => 2
        // [X] 1: P[B] => 3
        //
        // [X] 2: P[B] => 0
        // [X] 2: P[B] => 1
        // [X] 2: P[B] => 3
        //
        // [X] 3: P[B] => 0
        // [X] 3: P[B] => 1
        // [X] 3: P[B] => 2
        //
        //
        //
        //
        // * Election is triggered, and node 1 is the new leader.
        // * node 1 (The new leader) is constructing a new block B` and sends PP[B`] to 0, 2 and 3.
        // * 2 rejects the block (Already prepared on B)
        // * 1, 0, and 3 accepts the new block B`
        // * we have a fork!
        // The solution is to have a commit phase.
        //

        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const testNetwork = aTestNetwork(4, [block1, block2]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const gossip0 = testNetwork.getNodeGossip(node0.publicKey);
        const gossip1 = testNetwork.getNodeGossip(node1.publicKey);
        const gossip2 = testNetwork.getNodeGossip(node2.publicKey);
        const gossip3 = testNetwork.getNodeGossip(node3.publicKey);

        gossip0.setOutGoingWhiteListPKs([node1.publicKey, node2.publicKey]);
        gossip1.setOutGoingWhiteListPKs([node2.publicKey]);
        gossip2.setOutGoingWhiteListPKs([]);
        gossip3.setOutGoingWhiteListPKs([]);

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);

        expect(await node0.getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);
        expect(await node1.getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);
        expect(await node2.getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);
        expect(await node3.getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);

        gossip0.clearOutGoingWhiteListPKs();
        gossip1.clearOutGoingWhiteListPKs();
        gossip2.clearOutGoingWhiteListPKs();
        gossip3.clearOutGoingWhiteListPKs();
        gossip3.setIncomingWhiteListPKs([]);

        // elect node1 as the leader
        node0.triggerElection();
        node2.triggerElection();
        node3.triggerElection();
        await testNetwork.resolveAllValidations(true);

        await testNetwork.provideNextBlock();
        await nextTick();
        await testNetwork.resolveAllValidations(true);

        expect(await node0.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node1.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node2.getLatestCommittedBlock()).to.deep.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.deep.equal(theGenesisBlock);

        testNetwork.shutDown();
    });

    it("should not process gossip messages from nodes that are not part of the network (isMember = false)", async () => {
        const testNetwork = aTestNetwork();

        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const gossip1 = testNetwork.getNodeGossip(node1.publicKey);
        const gossip2 = testNetwork.getNodeGossip(node2.publicKey);

        // node0, if faking other messages
        const block1 = aBlock(theGenesisBlock);
        const PPmessage1: PrePrepareMessage = aPrePrepareMessage(node1.keyManager, 1, 0, block1);
        const Pmessage1: PrepareMessage = aPrepareMessage(node1.keyManager, 1, 0, block1);
        const Cmessage1: CommitMessage = aCommitMessage(node1.keyManager, 1, 0, block1);
        gossip1.onRemoteMessage(messageToGossip(PPmessage1)); // node1 causing preprepare on node1
        gossip1.onRemoteMessage(messageToGossip(Pmessage1)); // node1 pretending to send prepare as node1000
        gossip1.onRemoteMessage(messageToGossip(Pmessage1)); // node1 pretending to send prepare as node2000
        gossip1.onRemoteMessage(messageToGossip(Cmessage1)); // node1 pretending to send commit as node1000
        gossip1.onRemoteMessage(messageToGossip(Cmessage1)); // node1 pretending to send commit as node2000

        const block2 = aBlock(theGenesisBlock);
        const PPmessage2: PrePrepareMessage = aPrePrepareMessage(node2.keyManager, 1, 0, block2);
        const Pmessage2: PrepareMessage = aPrepareMessage(node2.keyManager, 1, 0, block2);
        const Cmessge2: CommitMessage = aCommitMessage(node2.keyManager, 1, 0, block2);
        gossip2.onRemoteMessage(messageToGossip(PPmessage2)); // node1 causing preprepare on node2
        gossip2.onRemoteMessage(messageToGossip(Pmessage2)); // node1 pretending to send prepare as node1000
        gossip2.onRemoteMessage(messageToGossip(Pmessage2)); // node1 pretending to send prepare as node2000
        gossip2.onRemoteMessage(messageToGossip(Cmessge2)); // node1 pretending to send commit as node1000
        gossip2.onRemoteMessage(messageToGossip(Cmessge2)); // node1 pretending to send commit as node2000

        await nextTick();
        expect(await node1.getLatestCommittedBlock()).to.not.equal(block1);
        expect(await node2.getLatestCommittedBlock()).to.not.equal(block2);

        expect(await node1.getLatestCommittedBlock()).to.not.equal(block1);
        expect(await node2.getLatestCommittedBlock()).to.not.equal(block2);

        testNetwork.shutDown();
    });

});