import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { BlocksProviderMock } from "./blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { SilentLogger } from "./logger/SilentLogger";
import { InMemoryPBFTStorage } from "./storage/InMemoryPBFTStorage";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Spam Prevention", () => {
    it("should store the PREPARE on the same term only one time", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const nodeBuilder = aNode().storingOn(inspectedStorage);
        const block = aBlock(theGenesisBlock);
        const blocksValidator = new BlocksValidatorMock();
        const blocksProvider = new BlocksProviderMock([block]);
        const network = aNetwork()
            .with(4).nodes
            .withCustomNode(nodeBuilder)
            .gettingBlocksVia(blocksProvider)
            .validateUsing(blocksValidator)
            .build();

        const leader = network.nodes[0];
        const node = network.nodes[4];

        network.startConsensusOnAllNodes();
        await blocksProvider.provideNextBlock();
        leader.pbft.gossip.unicast(leader.id, node.id, "preprepare", { block, view: 0, term: 0 });
        leader.pbft.gossip.unicast(leader.id, node.id, "preprepare", { block, view: 0, term: 0 });
        await nextTick();
        await blocksValidator.resolveAllValidations(true);

        expect(inspectedStorage.getPrepare(0, 0, block.header.hash).length).to.equal(4);
        network.shutDown();
    });
});