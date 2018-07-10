import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { BlocksProviderMock } from "./blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aNetwork } from "./builders/NetworkBuilder";
import { InMemoryNetwork } from "./network/InMemoryNetwork";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Block Validation", () => {
    let block: Block;
    let blocksValidator: BlocksValidatorMock;
    let blocksProvider: BlocksProviderMock;
    let network: InMemoryNetwork;

    beforeEach(() => {
        block = aBlock(theGenesisBlock);
        blocksValidator = new BlocksValidatorMock();
        blocksProvider = new BlocksProviderMock([block]);
        network = aNetwork()
            .validateUsing(blocksValidator)
            .gettingBlocksVia(blocksProvider)
            .with(4).nodes
            .build();
    });

    afterEach(() => {
        network.shutDown();
    });

    it("should call validateBlock on onPrepare", async () => {
        const spy = sinon.spy(blocksValidator, "validateBlock");
        network.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);

        expect(spy).to.have.been.calledWith(block);
        expect(network.nodes).to.agreeOnBlock(block);
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        network.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(false);

        expect(network.nodes).to.not.agreeOnBlock(block);
    });
});