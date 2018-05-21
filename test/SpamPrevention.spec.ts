import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aLoyalNode } from "./builders/NodeBuilder";
import { ConsoleLogger } from "./logger/ConsoleLogger";
import { ByzantineNode } from "./network/ByzantineNode";

chai.use(sinonChai);

describe("Spam Prevention", () => {
    it("should store the PREPARE on the same term only one time", () => {
        const logger = new ConsoleLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const nodeBuilder = aLoyalNode().named("Loyal-Node").storingOn(inspectedStorage);
        const network = aNetwork().leadBy.a.byzantineLeader.with(3).loyalNodes.withNode(nodeBuilder).build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0] as ByzantineNode;
        const node = network.nodes[4];

        leader.suggestBlockTo(block, node);
        leader.suggestBlockTo(block, node);

        expect(inspectedStorage.countOfPrepared(block.hash)).to.equal(1);
        network.shutDown();
    });
});