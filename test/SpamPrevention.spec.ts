import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aNode } from "./builders/NodeBuilder";
import { SilentLogger } from "./logger/SilentLogger";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Spam Prevention", () => {
    it("should store the PREPARE on the same term only one time", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const nodeBuilder = aNode().storingOn(inspectedStorage);
        const network = aNetwork().with(4).nodes.withCustomeNode(nodeBuilder).build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node = network.nodes[4];

        leader.pbft.gossip.unicast(leader.id, node.id, "preprepare", { block: block, view: 0, term: 0 });
        leader.pbft.gossip.unicast(leader.id, node.id, "preprepare", { block: block, view: 0, term: 0 });
        await nextTick();

        expect(inspectedStorage.getPrepare(0, 0).length).to.equal(1);
        network.shutDown();
    });
});