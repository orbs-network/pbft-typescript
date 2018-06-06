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
        et.register(spy);
        et.start();
        await wait(20);

        expect(spy).to.have.been.calledOnce;
    });

    it("should register to the election twice, wait for the timeout, and see that the cb was called twice", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        et.register(spy1);
        et.register(spy2);
        et.start();
        await wait(20);

        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should trigger the cb, twice if enough time passed", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.register(spy);
        et.start();
        await wait(30);

        expect(spy).to.have.been.calledTwice;
    });

    it("should not trigger the cb, if stopped", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.register(spy);
        et.start();
        await wait(5);
        et.stop();
        await wait(15);

        expect(spy).to.not.have.been.called;
    });
});