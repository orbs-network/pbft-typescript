/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Config } from "../src/Config";
import { PBFTTerm } from "../src/PBFTTerm";
import { aConfig } from "./builders/ConfigBuilder";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { blockMatcher } from "./matchers/blockMatcher";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    it("should not accept views from the past", async () => {
        const config: Config = aConfig();
        const electionTriggers: ElectionTriggerMock[] = [];
        config.electionTriggerFactory = (view: number) => {
            const t = new ElectionTriggerMock(view);
            electionTriggers.push(t);
            return t;
        };
        const triggerElection = () => electionTriggers.map(e => e.trigger());

        const pbftTerm: PBFTTerm = new PBFTTerm(config, 10, () => { });
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);
        pbftTerm.onReceiveNewView("node0", { term: 10, view: 0, PP: undefined });
        expect(pbftTerm.getView()).to.equal(1);
    });
});