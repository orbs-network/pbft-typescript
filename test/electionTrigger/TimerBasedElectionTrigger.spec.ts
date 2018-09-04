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
        et.registerOnTrigger(0, spy);
        await wait(15);

        expect(spy).to.have.been.calledOnce;
        et.unregisterOnTrigger();
    });

    it("should trigger the cb, once even if enough time passed", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(0, spy);
        await wait(25);

        expect(spy).to.have.been.calledOnce;
        et.unregisterOnTrigger();
    });

    it("should ignore register with the same view", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(30);
        const spy = sinon.spy();
        et.registerOnTrigger(0, spy);
        await wait(10);
        et.registerOnTrigger(0, spy);
        await wait(10);
        et.registerOnTrigger(0, spy);
        await wait(20);
        et.registerOnTrigger(0, spy);

        expect(spy).to.have.been.calledOnce;
        et.unregisterOnTrigger();
    });

    it("should not trigger if the register was called with a new view", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(0, spy); // 2 ** 0 * 10 = 10
        await wait(5);
        et.registerOnTrigger(1, spy); // 2 ** 1 * 10 = 20
        await wait(15);
        et.registerOnTrigger(2, spy); // 2 ** 2 * 10 = 40
        await wait(35);
        et.registerOnTrigger(3, spy); // 2 ** 3 * 10 = 80

        expect(spy).to.not.have.been.called;
        et.unregisterOnTrigger();
    });

    it("should use '2 ** view * minTimeout' to calculate the timeout", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        // expected timeout is 2 ** 2 * 10 = 40
        et.registerOnTrigger(2, spy);
        await wait(35);
        expect(spy).to.not.have.been.called;
        await wait(10);
        expect(spy).to.have.been.calledOnce;

        et.unregisterOnTrigger();
    });

    it("should not trigger the cb, if unregistered", async () => {
        const et: ElectionTrigger = new TimerBasedElectionTrigger(10);
        const spy = sinon.spy();
        et.registerOnTrigger(0, spy);
        await wait(5);
        et.unregisterOnTrigger();
        await wait(15);

        expect(spy).to.not.have.been.called;
    });
});