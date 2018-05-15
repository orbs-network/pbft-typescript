import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { LoyalNode } from "./network/LoyalNode";
import { wait } from "./timeUtils";

chai.use(sinonChai);

describe("Block Validation", () => {
    it("should call validateBlock on onPrepare", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as LoyalNode;
        node1.config.validateBlock = async () => true;
        const spy = sinon.spy(node1.config, "validateBlock");
        leader.suggestBlock(block);

        await wait(10);
        expect(spy).to.have.been.calledWith(block);
        expect(network).to.reachConsensusOnBlock(block);
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        const network = aNetwork().with().loyalLeader().with(3).loyalNodes().build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as LoyalNode;
        node1.config.validateBlock = async () => false;
        leader.suggestBlock(block);

        await wait(10);
        expect(network).to.not.reachConsensusOnBlock(block);
    });
});