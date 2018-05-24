import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryPBFTStorage } from "../src/storage/InMemoryPBFTStorage";
import { PBFTStorage } from "../src/storage/PBFTStorage";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { aLoyalNode } from "./builders/NodeBuilder";
import { SilentLogger } from "./logger/SilentLogger";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Byzantine Attacks", () => {
    it("should ignore preprepare messages pretend to be me (Use my public key)", async () => {
        const logger = new SilentLogger();
        const inspectedStorage: PBFTStorage = new InMemoryPBFTStorage(logger);
        const leaderBuilder = aLoyalNode().storingOn(inspectedStorage);
        const network = aNetwork().leadBy.a.customLeader(leaderBuilder).with(3).loyalNodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        leader.pbft.gossip.unicast(leader.id, leader.id, "preprepare", {block, view: 0});
        await nextTick();

        expect(inspectedStorage.countOfPrepared(block.hash)).to.equal(0);
        network.shutDown();
    });
});