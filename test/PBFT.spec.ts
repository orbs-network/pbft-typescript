/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aSimpleNetwork } from "./builders/NetworkBuilder";
import { InMemoryGossip } from "./gossip/InMemoryGossip";
import { blockMatcher } from "./matchers/blockMatcher";
import { NodeMock } from "./network/NodeMock";

chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFT", () => {
    it("should send pre-prepare only if it's the leader", async () => {
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork();
        const spy0 = sinon.spy(network.nodes[0].pbft.gossip, "multicast");
        const spy1 = sinon.spy(network.nodes[1].pbft.gossip, "multicast");
        const spy2 = sinon.spy(network.nodes[2].pbft.gossip, "multicast");
        const spy3 = sinon.spy(network.nodes[3].pbft.gossip, "multicast");

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();
        const preprepareCounter = (spy: sinon.SinonSpy) => spy.getCalls().filter(c => c.args[2] === "preprepare").length;

        expect(preprepareCounter(spy0)).to.equal(2);
        expect(preprepareCounter(spy1)).to.equal(0);
        expect(preprepareCounter(spy2)).to.equal(0);
        expect(preprepareCounter(spy3)).to.equal(0);

        network.shutDown();
    });

    it("should start a network, append a block, and make sure that all nodes recived it", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork();

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes).to.agreeOnBlock(blocksPool[0]);
        network.shutDown();
    });

    it("should ignore suggested block if they are not from the leader", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork();

        network.nodes[3].startConsensus(); // pretending to be the leader
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes).to.not.agreeOnBlock(blocksPool[0]);
        network.shutDown();
    });

    it("should reach consensus, in a network of 4 nodes, where the leader is byzantine and the other 3 nodes are loyal", async () => {
        const block1 = aBlock(theGenesisBlock, "block1");
        const block2 = aBlock(theGenesisBlock, "block2");
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork(4, [block1, block2]);

        const leaderGossip = network.nodes[0].pbft.gossip as InMemoryGossip;

        // suggest block 1 to nodes 1 and 2
        leaderGossip.setOutGoingWhiteList([network.nodes[1].id, network.nodes[2].id]);
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        // suggest block 2 to node 3.
        leaderGossip.setOutGoingWhiteList([network.nodes[3].id]);
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes[1].getLatestBlock()).to.equal(block1);
        expect(network.nodes[2].getLatestBlock()).to.equal(block1);
        expect(network.nodes[3].getLatestBlock()).to.be.undefined;
        network.shutDown();
    });

    it("should reach consensus, in a network of 5 nodes, where one of the nodes is byzantine and the others are loyal", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork(5);

        const byzantineNode = network.nodes[4];
        const gossip = byzantineNode.pbft.gossip as InMemoryGossip;
        gossip.setIncomingWhiteList([]); // prevent any income gossip messages

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes.splice(0, 3)).to.agreeOnBlock(blocksPool[0]);
    });

    it("should reach consensus, even when a byzantine node is sending a bad block several times", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork();
        const goodBlock = blocksPool[0];
        const fakeBlock = aBlock(theGenesisBlock);

        const byzantineNode = network.nodes[3];

        network.startConsensusOnAllNodes();
        const gossip = byzantineNode.pbft.gossip;
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });
        gossip.broadcast(byzantineNode.id, "preprepare", { block: fakeBlock, view: 0, term: 0 });

        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes).to.agreeOnBlock(goodBlock);
        network.shutDown();
    });

    it("should reach consensus, in a network of 7 nodes, where two of the nodes is byzantine and the others are loyal", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork(7);

        const byzantineNode1 = network.nodes[5];
        const byzantineNode2 = network.nodes[6];
        const gossip1 = byzantineNode1.pbft.gossip as InMemoryGossip;
        const gossip2 = byzantineNode2.pbft.gossip as InMemoryGossip;
        gossip1.setIncomingWhiteList([]);
        gossip2.setIncomingWhiteList([]);

        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes.splice(0, 4)).to.agreeOnBlock(blocksPool[0]);
        network.shutDown();
    });

    it("should fire onNewBlock only once per block, even if there were more confirmations", async () => {
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork();

        // block 1
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        // block 2
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        const node = network.nodes[1] as NodeMock;
        expect(node.blockLog.length).to.equal(2);
        network.shutDown();
    });

    it("should not accept a block if it is not pointing to the previous block", async () => {
        const block1 = aBlock(theGenesisBlock);
        const notInOrderBlock = aBlock(aBlock(theGenesisBlock));
        const { network, blocksProvider, blocksValidator } = aSimpleNetwork(4, [block1, notInOrderBlock]);

        // block 1
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        // not in otder block
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes).to.agreeOnBlock(block1);
        network.shutDown();
    });

    it("should not process gossip messages after dispose", async () => {
        const { network, blocksProvider, blocksValidator, blocksPool } = aSimpleNetwork();

        // block 1
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(network.nodes).to.agreeOnBlock(blocksPool[0]);
        network.shutDown();

        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];
        const spy1 = sinon.spy(node1.pbft.gossip, "multicast");
        const spy2 = sinon.spy(node2.pbft.gossip, "multicast");
        const spy3 = sinon.spy(node3.pbft.gossip, "multicast");

        // block 2 (After network shutdown)
        network.startConsensusOnAllNodes();
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();

        expect(spy1).to.not.have.been.called;
        expect(spy2).to.not.have.been.called;
        expect(spy3).to.not.have.been.called;
    });

    it("should change the leader on timeout (no commits for too long)", async () => {
        const block1 = aBlock(theGenesisBlock, "Block1");
        const block2 = aBlock(block1, "Block2");
        const block3 = aBlock(block1, "Block3");
        const block4 = aBlock(block3, "Block4");
        const { network, blocksProvider, blocksValidator, triggerElection } = aSimpleNetwork(4, [block1, block2, block3, block4]);

        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const node3 = network.nodes[3];

        // block 1
        network.startConsensusOnAllNodes();

        // (only) node0 is the leader
        expect(node0.isLeader()).to.be.true;
        expect(node1.isLeader()).to.be.false;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;

        // processing block1, should be agreed by all nodes
        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();
        expect(network.nodes).to.agreeOnBlock(block1);

        // processing block 2
        await blocksProvider.afterAllBlocksProvided();
        triggerElection(); // force leader election before the block was verified, goes to block 3
        expect(node0.isLeader()).to.be.false;
        expect(node1.isLeader()).to.be.true;
        expect(node2.isLeader()).to.be.false;
        expect(node3.isLeader()).to.be.false;
        await blocksValidator.resolveValidations();

        await blocksProvider.afterAllBlocksProvided();
        await blocksValidator.resolveValidations();
        expect(network.nodes).to.agreeOnBlock(block3);

        network.shutDown();
    });
});