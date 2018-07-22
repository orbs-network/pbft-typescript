import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { CommitPayload, PreparePayload, PrePreparePayload } from "../src/networkCommunication/Payload";
import { calculateBlockHash } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aPayload } from "./builders/PayloadBuilder";
import { aSimpleTestNetwork, aTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Byzantine Attacks", () => {
    it("Block validation is completed after new election, old validation should be ignored", async () => {
        const block1 = aBlock(theGenesisBlock);
        const block2 = aBlock(theGenesisBlock);
        const { testNetwork, blockUtils, blocksValidator, triggerElection } = aSimpleTestNetwork(4, [block1, block2]);

        const leader = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const leaderGossip = testNetwork.getNodeGossip(leader.pk);
        leaderGossip.setOutGoingWhiteListPKs([node1.pk, node2.pk]);
        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();

        triggerElection();

        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);

        expect(await node1.getLatestCommittedBlock()).to.equal(block2);
        expect(await node2.getLatestCommittedBlock()).to.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.equal(block2);
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
        const { testNetwork, blockUtils, blocksValidator, triggerElection } = aSimpleTestNetwork(4, [block1, block2]);

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const node3 = testNetwork.nodes[3];

        const gossip0 = testNetwork.getNodeGossip(node0.pk);
        const gossip1 = testNetwork.getNodeGossip(node1.pk);
        const gossip2 = testNetwork.getNodeGossip(node2.pk);
        const gossip3 = testNetwork.getNodeGossip(node3.pk);

        gossip0.setOutGoingWhiteListPKs([node1.pk, node2.pk]);
        gossip1.setOutGoingWhiteListPKs([node2.pk]);
        gossip2.setOutGoingWhiteListPKs([]);
        gossip3.setOutGoingWhiteListPKs([]);

        testNetwork.startConsensusOnAllNodes();
        await nextTick();
        await blockUtils.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);

        expect(await node0.getLatestCommittedBlock()).to.equal(theGenesisBlock);
        expect(await node1.getLatestCommittedBlock()).to.equal(theGenesisBlock);
        expect(await node2.getLatestCommittedBlock()).to.equal(theGenesisBlock);
        expect(await node3.getLatestCommittedBlock()).to.equal(theGenesisBlock);

        gossip0.clearOutGoingWhiteListPKs();
        gossip1.clearOutGoingWhiteListPKs();
        gossip2.clearOutGoingWhiteListPKs();
        gossip3.clearOutGoingWhiteListPKs();
        gossip3.setIncomingWhiteListPKs([]);

        // elect node2 as the leader
        triggerElection();
        await blocksValidator.resolveAllValidations(true);

        await blockUtils.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);

        expect(await node0.getLatestCommittedBlock()).to.equal(block2);
        expect(await node1.getLatestCommittedBlock()).to.equal(block2);
        expect(await node2.getLatestCommittedBlock()).to.equal(block2);
        expect(await node3.getLatestCommittedBlock()).to.equal(theGenesisBlock);

        testNetwork.shutDown();
    });

    it("should not process gossip messages from nodes that are not part of the network (isMember = false)", async () => {
        const testNetwork = aTestNetwork()
            .with(4)
            .nodes
            .build();

        const node0 = testNetwork.nodes[0];
        const node1 = testNetwork.nodes[1];
        const node2 = testNetwork.nodes[2];
        const gossip1 = testNetwork.getNodeGossip(node1.pk);
        const gossip2 = testNetwork.getNodeGossip(node2.pk);

        // node0, if faking other messages
        const block1 = aBlock(theGenesisBlock);
        const PPpayload1: PrePreparePayload = aPayload(node1.pk, { term: 1, view: 0, block: block1 });
        const blockHash1 = calculateBlockHash(block1);
        const Ppayload1: PreparePayload = aPayload(node1.pk, { term: 1, view: 0, blockHash: blockHash1 });
        const Cpayload1: CommitPayload = aPayload(node1.pk, { term: 1, view: 0, blockHash: blockHash1 });
        gossip1.onRemoteMessage("preprepare", PPpayload1); // node1 causing preprepare on node1
        gossip1.onRemoteMessage("prepare", Ppayload1); // node1 pretending to send prepare as node1000
        gossip1.onRemoteMessage("prepare", Ppayload1); // node1 pretending to send prepare as node2000
        gossip1.onRemoteMessage("commit", Cpayload1); // node1 pretending to send commit as node1000
        gossip1.onRemoteMessage("commit", Cpayload1); // node1 pretending to send commit as node2000

        const block2 = aBlock(theGenesisBlock);
        const PPpayload2: PrePreparePayload = aPayload(node2.pk, { term: 1, view: 0, block: block2 });
        const blockHash2 = calculateBlockHash(block2);
        const Ppayload2: PreparePayload = aPayload(node2.pk, { term: 1, view: 0, blockHash: blockHash2 });
        const Cpayload2: CommitPayload = aPayload(node2.pk, { term: 1, view: 0, blockHash: blockHash2 });
        gossip2.onRemoteMessage("preprepare", PPpayload2); // node1 causing preprepare on node2
        gossip2.onRemoteMessage("prepare", Ppayload2); // node1 pretending to send prepare as node1000
        gossip2.onRemoteMessage("prepare", Ppayload2); // node1 pretending to send prepare as node2000
        gossip2.onRemoteMessage("commit", Cpayload2); // node1 pretending to send commit as node1000
        gossip2.onRemoteMessage("commit", Cpayload2); // node1 pretending to send commit as node2000

        await nextTick();
        expect(await node1.getLatestCommittedBlock()).to.not.equal(block1);
        expect(await node2.getLatestCommittedBlock()).to.not.equal(block2);

        expect(await node1.getLatestCommittedBlock()).to.not.equal(block1);
        expect(await node2.getLatestCommittedBlock()).to.not.equal(block2);

        testNetwork.shutDown();
    });

});