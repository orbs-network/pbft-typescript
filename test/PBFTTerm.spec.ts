/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { PBFTTerm } from "../src/PBFTTerm";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aConfig } from "./builders/ConfigBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { blockMatcher } from "./matchers/blockMatcher";
import { nextTick } from "./timeUtils";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    const init = (nodeId = "DummyNode") => {
        const config = aConfig().named(nodeId).build();
        const electionTriggers: ElectionTriggerMock[] = [];
        config.electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTriggers.push(t);
            return t;
        };
        const triggerElection = () => electionTriggers.map(e => e.trigger());

        return { config, triggerElection };
    };

    it("onNewView should not accept views from the past", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);
        const leaderId = config.network.getNodeIdBySeed(1);

        pbftTerm.onReceiveNewView(leaderId, { term: 0, view: 0, PP: undefined });
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onViewChange should not accept views from the past", async () => {
        const { config, triggerElection } = init("Node1");

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);
        const leaderId = config.network.getNodeIdBySeed(1);

        const spy = sinon.spy(config.pbftStorage, "storeViewChange");
        // current view (1) => valid
        pbftTerm.onReceiveViewChange(leaderId, { term: 0, newView: 1 });
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        pbftTerm.onReceiveViewChange(leaderId, { term: 0, newView: 0 });
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept views from the past", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);
        const noneLeaderId = config.network.getNodeIdBySeed(2);

        const spy = sinon.spy(config.pbftStorage, "storePrepare");
        const block: Block = aBlock(theGenesisBlock);

        // current view (1) => valid
        pbftTerm.onReceivePrepare(noneLeaderId, { term: 0, view: 1, blockHash: block.hash });
        expect(spy).to.have.been.called;

        // view from the future (2) => valid
        spy.resetHistory();
        pbftTerm.onReceivePrepare(noneLeaderId, { term: 0, view: 2, blockHash: block.hash });
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        pbftTerm.onReceivePrepare(noneLeaderId, { term: 0, view: 0, blockHash: block.hash });
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should accept views that match its current view", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);
        const leaderId = config.network.getNodeIdBySeed(1);

        const block: Block = aBlock(theGenesisBlock);
        const spy = sinon.spy(config.pbftStorage, "storePrepare");

        // current view (1) => valid
        pbftTerm.onReceivePrePrepare(leaderId, { term: 0, view: 1, block });
        await config.blocksValidator.resolveValidations();
        expect(spy).to.have.been.called;

        // view from the future (2) => invalid, should be ignored
        spy.resetHistory();
        pbftTerm.onReceivePrePrepare(leaderId, { term: 0, view: 2, block });
        await config.blocksValidator.resolveValidations();
        expect(spy).to.not.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        pbftTerm.onReceivePrePrepare(leaderId, { term: 0, view: 0, block });
        await config.blocksValidator.resolveValidations();
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept messages from the leader", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        const leaderId = config.network.getNodeIdBySeed(0);
        const noneLeaderId = config.network.getNodeIdBySeed(1);

        const spy = sinon.spy(config.pbftStorage, "storePrepare");
        // not from the leader => ok
        pbftTerm.onReceivePrepare(noneLeaderId, { term: 0, view: 0, blockHash: "" });
        expect(spy).to.have.been.called;

        // from the leader => ignore
        spy.resetHistory();
        pbftTerm.onReceivePrepare(leaderId, { term: 0, view: 0, blockHash: "" });
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages not from the leader", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        const leaderId = config.network.getNodeIdBySeed(0);
        const noneLeaderId = config.network.getNodeIdBySeed(1);

        const block: Block = aBlock(theGenesisBlock);

        const spy = sinon.spy(config.blocksValidator, "validateBlock");
        // from the leader => ok
        pbftTerm.onReceivePrePrepare(leaderId, { term: 0, view: 0, block });
        expect(spy).to.have.been.called;

        // not from the leader => ignore
        spy.resetHistory();
        pbftTerm.onReceivePrePrepare(noneLeaderId, { term: 0, view: 0, block });
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages that don't match the leader", async () => {
        const { config } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });

        const block: Block = aBlock(theGenesisBlock);

        // from the leader => ok
        pbftTerm.onReceiveNewView(config.network.getNodeIdBySeed(1), { term: 0, view: 1, PP: {term: 0, view: 0, block} });
        await nextTick();
        await config.blocksValidator.resolveValidations();
        expect(pbftTerm.getView()).to.equal(1);

        // not from the leader => ignore
        pbftTerm.onReceiveNewView(config.network.getNodeIdBySeed(3), { term: 0, view: 2, PP: {term: 0, view: 0, block} });
        await config.blocksValidator.resolveValidations();
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onReceiveViewChange should not accept messages that don't match me as the leader", async () => {
        const { config } = init("Node1");

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        const node0Id = config.network.getNodeIdBySeed(0);
        const spy = sinon.spy(config.pbftStorage, "storeViewChange");

        // match me as a leader => ok
        pbftTerm.onReceiveViewChange(node0Id, { term: 0, newView: 1 });
        expect(spy).to.have.been.called;

        // doesn't match me as a leader => ignore
        spy.resetHistory();
        pbftTerm.onReceiveViewChange(node0Id, { term: 0, newView: 2 });
        expect(spy).to.not.have.been.called;
    });
});