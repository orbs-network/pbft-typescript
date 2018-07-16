/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { Config } from "../src/Config";
import { PBFTTerm } from "../src/PBFTTerm";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aPayload } from "./builders/PayloadBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { blockMatcher } from "./matchers/blockMatcher";
import { TestNetwork } from "./network/TestNetwork";
import { nextTick } from "./timeUtils";
import { BlocksValidatorMock } from "./blocksValidator/BlocksValidatorMock";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    let testNetwork: TestNetwork;
    let node0BlocksValidator: BlocksValidatorMock;
    let node1BlocksValidator: BlocksValidatorMock;
    let node2BlocksValidator: BlocksValidatorMock;
    let node3BlocksValidator: BlocksValidatorMock;

    let triggerElection: () => void;
    let node0Config: Config;
    let node1Config: Config;
    let node2Config: Config;
    let node3Config: Config;
    let node0Pk: string;
    let node1Pk: string;
    let node2Pk: string;
    let node3Pk: string;

    beforeEach(() => {
        const testNetworkData = aSimpleTestNetwork(4);

        testNetwork = testNetworkData.testNetwork;
        triggerElection = testNetworkData.triggerElection;
        node0Config = testNetwork.nodes[0].config;
        node1Config = testNetwork.nodes[1].config;
        node2Config = testNetwork.nodes[2].config;
        node3Config = testNetwork.nodes[3].config;
        node0BlocksValidator = node0Config.blocksValidator as BlocksValidatorMock;
        node1BlocksValidator = node0Config.blocksValidator as BlocksValidatorMock;
        node2BlocksValidator = node0Config.blocksValidator as BlocksValidatorMock;
        node3BlocksValidator = node0Config.blocksValidator as BlocksValidatorMock;
        node0Pk = testNetwork.nodes[0].pk;
        node1Pk = testNetwork.nodes[1].pk;
        node2Pk = testNetwork.nodes[2].pk;
        node3Pk = testNetwork.nodes[3].pk;
    });

    afterEach(() => {
        testNetwork.shutDown();
    });

    it("onNewView should not accept views from the past", async () => {
        const pbftTerm: PBFTTerm = new PBFTTerm(node0Config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);

        pbftTerm.onReceiveNewView(aPayload(node0Pk, { term: 1, view: 0, PP: undefined }));
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onViewChange should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");
        // current view (1) => valid
        node1PbftTerm.onReceiveViewChange(aPayload(node0Pk, { term: 1, newView: 1 }));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aPayload(node0Pk, { term: 1, newView: 0 }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        const block: Block = aBlock(theGenesisBlock);

        // current view (1) => valid
        node1PbftTerm.onReceivePrepare(aPayload(node0Pk, { term: 1, view: 1, blockHash: block.header.hash }));
        expect(spy).to.have.been.called;

        // view from the future (2) => valid
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0Pk, { term: 1, view: 2, blockHash: block.header.hash }));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0Pk, { term: 1, view: 0, blockHash: block.header.hash }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should accept views that match its current view", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const block: Block = aBlock(theGenesisBlock);
        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");

        // current view (1) => valid
        node1PbftTerm.onReceivePrePrepare(aPayload(node1Pk, { term: 1, view: 1, block }));
        await node1BlocksValidator.resolveAllValidations(true);
        expect(spy).to.have.been.called;

        // view from the future (2) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPayload(node1Pk, { term: 1, view: 2, block }));
        await node1BlocksValidator.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPayload(node1Pk, { term: 1, view: 0, block }));
        await node1BlocksValidator.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept messages from the leader", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        // not from the leader => ok
        node1PbftTerm.onReceivePrepare(aPayload(node2Pk, { term: 1, view: 0, blockHash: "" }));
        expect(spy).to.have.been.called;

        // from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0Pk, { term: 1, view: 0, blockHash: "" }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages not from the leader", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });
        const block: Block = aBlock(theGenesisBlock);

        const spy = sinon.spy(node1Config.blocksValidator, "validateBlock");
        // from the leader => ok
        node1PbftTerm.onReceivePrePrepare(aPayload(node0Pk, { term: 1, view: 0, block }));
        expect(spy).to.have.been.called;

        // not from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPayload(node2Pk, { term: 1, view: 0, block }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages that don't match the leader", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });

        const block: Block = aBlock(theGenesisBlock);

        // from the leader => ok
        node1PbftTerm.onReceiveNewView(aPayload(node2Pk, { term: 1, view: 2, PP: aPayload(node2Pk, { term: 1, view: 2, block }) }));
        await nextTick();
        await node1BlocksValidator.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);

        // not from the leader => ignore
        node1PbftTerm.onReceiveNewView(aPayload(node2Pk, { term: 1, view: 3, PP: aPayload(node2Pk, { term: 1, view: 3, block }) }));
        await node1BlocksValidator.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);
    });

    it("onReceiveViewChange should not accept messages that don't match me as the leader", async () => {
        const node1PbftTerm: PBFTTerm = new PBFTTerm(node1Config, 0, () => { });
        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");

        // match me as a leader => ok
        node1PbftTerm.onReceiveViewChange(aPayload(node0Pk, { term: 1, newView: 1 }));
        expect(spy).to.have.been.called;

        // doesn't match me as a leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aPayload(node0Pk, { term: 1, newView: 2 }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages don't match the PP.view", async () => {
        const node0PbftTerm: PBFTTerm = new PBFTTerm(node0Config, 0, () => { });

        const block: Block = aBlock(theGenesisBlock);

        // same view => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1Pk, { term: 1, view: 1, PP: aPayload(node1Pk, { term: 1, view: 1, block }) }));
        await nextTick();
        await node0BlocksValidator.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // miss matching view => ignore
        node0PbftTerm.onReceiveNewView(aPayload(node1Pk, { term: 1, view: 1, PP: aPayload(node1Pk, { term: 1, view: 2, block }) }));
        await node0BlocksValidator.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages that don't pass validation", async () => {
        const node0PbftTerm: PBFTTerm = new PBFTTerm(node0Config, 0, () => { });

        const block: Block = aBlock(theGenesisBlock);

        // pass validation => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1Pk, { term: 1, view: 1, PP: aPayload(node1Pk, { term: 1, view: 1, block }) }));
        await nextTick();
        await node0BlocksValidator.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // doesn't pass validation => ignore
        node0PbftTerm.onReceiveNewView(aPayload(node1Pk, { term: 1, view: 2, PP: aPayload(node1Pk, { term: 1, view: 2, block }) }));
        await node0BlocksValidator.resolveAllValidations(false);
        expect(node0PbftTerm.getView()).to.equal(1);
    });
});