import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { NodeMock } from "./network/NodeMock";

chai.use(sinonChai);

describe("Block Validation", () => {
    it("should call validateBlock on onPrepare", async () => {
        const network = aNetwork().with(4).nodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as NodeMock;
        const spy = sinon.spy(node1.pbft.blocksValidator, "validateBlock");
        await leader.suggestBlock(block);

        expect(spy).to.have.been.calledWith(block);
        expect(network.nodes).to.agreeOnBlock(block);
        network.shutDown();
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        const network = aNetwork().with(4).nodes.build();

        const block = aBlock(theGenesisBlock);
        const leader = network.nodes[0];
        const node1 = network.nodes[1] as NodeMock;
        node1.pbft.blocksValidator.validateBlock = async () => false;
        await leader.suggestBlock(block);

        expect(network.nodes).to.not.agreeOnBlock(block);
        network.shutDown();
    });
});