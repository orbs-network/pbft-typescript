import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
import { BlockUtilsMock } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aTestNetwork } from "./builders/TestNetworkBuilder";
import { TestNetwork } from "./network/TestNetwork";
import { nextTick } from "./timeUtils";

chai.use(sinonChai);

describe("Block Validation", () => {
    let block: Block;
    let blocksValidator: BlocksValidatorMock;
    let blockUtils: BlockUtilsMock;
    let testNetwork: TestNetwork;

    beforeEach(() => {
        block = aBlock(theGenesisBlock);
        blocksValidator = new BlocksValidatorMock();
        blockUtils = new BlockUtilsMock(blocksValidator, [block]);
        testNetwork = aTestNetwork()
            .validateUsing(blocksValidator)
            .gettingBlocksVia(blockUtils)
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
        await blockUtils.provideNextBlock();
        await nextTick();
        await blocksValidator.resolveAllValidations(true);
        await nextTick();

        expect(spy).to.have.been.calledWithMatch(block);
        expect(testNetwork.nodes).to.agreeOnBlock(block);
    });

    it("should not reach consensus if validateBlock returned false", async () => {
        testNetwork.startConsensusOnAllNodes();
        await nextTick(); // await for blockStorage.getBlockChainHeight();
        await blockUtils.provideNextBlock();
        await blocksValidator.resolveAllValidations(false);
        await nextTick();

        expect(testNetwork.nodes).to.not.agreeOnBlock(block);
    });
});