import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { BlocksProviderMock } from "./blocksProvider/BlocksProviderMock";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aTestNetwork } from "./builders/TestNetworkBuilder";
import { nextTick } from "./timeUtils";
import { TestNetwork } from "./network/TestNetwork";

chai.use(sinonChai);

describe("Block Validation", () => {
    let block: Block;
    let blocksValidator: BlocksValidatorMock;
    let blocksProvider: BlocksProviderMock;
    let testNetwork: TestNetwork;

    beforeEach(() => {
        block = aBlock(theGenesisBlock);
        blocksValidator = new BlocksValidatorMock();
        blocksProvider = new BlocksProviderMock([block]);
        testNetwork = aTestNetwork()
            .validateUsing(blocksValidator)
            .gettingBlocksVia(blocksProvider)
            .with(4).nodes
            .build();
    });

    afterEach(() => {
        testNetwork.shutDown();
    });

    it("should call validateBlock on onPrepare", async () => {
        const spy = sinon.spy(blocksValidator, "validateBlock");
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(true);

        expect(spy).to.have.been.calledWith(block);
        expect(testNetwork.nodes).to.agreeOnBlock(block);
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blocksProvider.provideNextBlock();
        await blocksValidator.resolveAllValidations(false);

        expect(testNetwork.nodes).to.not.agreeOnBlock(block);
    });
});