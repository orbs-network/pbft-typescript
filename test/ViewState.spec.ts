/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { ElectionTriggerFactory } from "../src/electionTrigger/ElectionTrigger";
import { ViewState } from "../src/ViewState";
import { ElectionTriggerMock } from "./electionTrigger/ElectionTriggerMock";
import { blockMatcher } from "./matchers/blockMatcher";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("ViewState", () => {
    it("should hold a readonly view property", async () => {
        const view = Math.floor(Math.random());
        const cb = () => {};
        const electionTriggerFactory: ElectionTriggerFactory = view => new ElectionTriggerMock(view);
        const viewState = new ViewState(electionTriggerFactory, view, cb);
        const actual = viewState.view;
        expect(actual).to.equal(view);
    });

    it("should hold a callback to be called once a new leader was elected", async () => {
        const view = Math.floor(Math.random());
        const spy = sinon.spy();
        let electionTrigger: ElectionTriggerMock;
        const electionTriggerFactory: ElectionTriggerFactory = view => {
            electionTrigger = new ElectionTriggerMock(view);
            return electionTrigger;
        };
        const viewState = new ViewState(electionTriggerFactory, view, spy);
        electionTrigger.trigger();
        expect(spy).to.have.been.calledOnce;
    });

    it("should not call the callback if the instance was disposed", async () => {
        const view = Math.floor(Math.random());
        const spy = sinon.spy();
        let electionTrigger: ElectionTriggerMock;
        const electionTriggerFactory: ElectionTriggerFactory = view => {
            electionTrigger = new ElectionTriggerMock(view);
            return electionTrigger;
        };
        const viewState = new ViewState(electionTriggerFactory, view, spy);
        viewState.dispose();
        electionTrigger.trigger();
        expect(spy).to.not.have.been.calledOnce;
    });
});