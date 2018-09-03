import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { ElectionTrigger } from "../../src/electionTrigger/ElectionTrigger";
import { TimerBasedElectionTrigger } from "../../src/electionTrigger/TimerBasedElectionTrigger";
import { wait } from "../timeUtils";

chai.use(sinonChai);

describe("Timer Based Election Trigger", () => {
    it("should register to the election, wait for the timeout, and see that the cb was called", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(spy);
        et.setView(0);
        await wait(15);

        expect(spy).to.have.been.calledOnce;
        et.unregisterOnTrigger();
    });

    it("should trigger the cb, twice if enough time passed", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(spy);
        et.setView(0);
        await wait(25);

        expect(spy).to.have.been.calledTwice;
        et.unregisterOnTrigger();
    });

    it("should not trigger the cb, if unregistered", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(spy);
        et.setView(0);
        await wait(5);
        et.unregisterOnTrigger();
        await wait(15);

        expect(spy).to.not.have.been.called;
    });
});