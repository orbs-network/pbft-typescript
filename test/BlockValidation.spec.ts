import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { LoyalNode } from "./network/LoyalNode";

chai.use(sinonChai);

describe("Block Validation", () => {
    it("should call validateBlock on onPrepare", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as LoyalNode;
        const spy = sinon.spy(node1.pbft.blockValidator, "validateBlock");
        await leader.suggestBlock(block);

        expect(spy).to.have.been.calledWith(block);
        expect(network).to.reachConsensusOnBlock(block);
        network.shutDown();
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(3).loyalNodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as LoyalNode;
        node1.pbft.blockValidator.validateBlock = async () => false;
        await leader.suggestBlock(block);

        expect(network).to.not.reachConsensusOnBlock(block);
        network.shutDown();
    });
});