/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Block } from "../src/Block";
import { Config } from "../src/Config";
import { PBFTTerm } from "../src/PBFTTerm";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aConfig } from "./builders/ConfigBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { blockMatcher } from "./matchers/blockMatcher";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    const init = () => {
        const config: Config = aConfig();
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
        pbftTerm.onReceiveNewView("node0", { term: 0, view: 0, PP: undefined });
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onViewChange should not accept views from the past", async () => {
        const { config, triggerElection } = init();

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 0, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(config.pbftStorage, "storeViewChange");
        // current view (1) => valid
        pbftTerm.onReceiveViewChange("node0", { term: 0, newView: 1 });
        expect(spy).to.have.been.called;

        // view from the future (2) => valid
        spy.resetHistory();
        pbftTerm.onReceiveViewChange("node0", { term: 0, newView: 2 });
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        pbftTerm.onReceiveViewChange("node0", { term: 0, newView: 0 });
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
});