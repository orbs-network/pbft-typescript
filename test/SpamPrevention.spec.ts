import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { BlockUtilsMock, calculateBlockHash } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNode } from "./builders/NodeBuilder";
import { aPayload, aPrePreparePayload } from "./builders/PayloadBuilder";
import { aTestNetwork } from "./builders/TestNetworkBuilder";
import { SilentLogger } from "./logger/SilentLogger";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Spam Prevention", () => {
    it("should store the PREPARE on the same term only one time", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const nodeBuilder = aNode().storingOn(inspectedStorage);
        const block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const blockUtils = new BlockUtilsMock([block]);
        const testNetwork = aTestNetwork()
            .with(4).nodes
            .withCustomNode(nodeBuilder)
            .gettingBlocksVia(blockUtils)
            .build();

        const leader = testNetwork.nodes[0];
        const node = testNetwork.nodes[4];

        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getLastBlock();
        await blockUtils.provideNextBlock();
        await nextTick();
        const gossip = testNetwork.getNodeGossip(leader.pk);
        gossip.unicast(node.pk, "preprepare", aPrePreparePayload(leader.pk, { blockHash, view: 0, term: 1 }, block));
        gossip.unicast(node.pk, "preprepare", aPrePreparePayload(leader.pk, { blockHash, view: 0, term: 1 }, block));
        await nextTick();
        await blockUtils.resolveAllValidations(true);
        await nextTick();

        expect(inspectedStorage.getPrepare(1, 0, blockHash).length).to.equal(4);
        testNetwork.shutDown();
    });
});