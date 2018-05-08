import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { InMemoryGossip } from "./InMemoryGossip";

chai.use(sinonChai);

describe("InMemory Gossip", () => {
    it("should allow to create a gossip instance", () => {
        const gossip = new InMemoryGossip();
        expect(gossip).not.to.be.undefined;
    });

    it("should be able to broadcast a message to a subscribed client", () => {
        const listener = new InMemoryGossip();
        const broadcaster = new InMemoryGossip();
        const spy = sinon.spy();
        const message = Math.random().toString();

        listener.subscribe(message, spy);
        broadcaster.registerRemoteMessagesListener("listener1", listener);
        broadcaster.broadcast(message);

        expect(spy).to.have.been.calledOnce;
    });

    it("should be able to broadcast a message to many clients", () => {
        const listener1 = new InMemoryGossip();
        const listener2 = new InMemoryGossip();
        const broadcaster = new InMemoryGossip();
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);

        broadcaster.registerRemoteMessagesListener("listener1", listener1);
        broadcaster.registerRemoteMessagesListener("listener2", listener2);
        broadcaster.broadcast(message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should get called only for the requested message", () => {
        const broadcaster = new InMemoryGossip();
        const listener = new InMemoryGossip();
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message1 = Math.random().toString();
        const message2 = Math.random().toString();
        listener.subscribe(message1, spy1);
        listener.subscribe(message2, spy2);

        broadcaster.registerRemoteMessagesListener("listener1", listener);
        broadcaster.broadcast(message1);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.not.have.been.calledOnce;
    });

    it("should be able to unsubscribe", () => {
        const broadcaster = new InMemoryGossip();
        const listener = new InMemoryGossip();
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        const subscriptionToken = listener.subscribe(message, spy1);
        listener.subscribe(message, spy2);
        listener.unsubscribe(subscriptionToken);
        broadcaster.registerRemoteMessagesListener("listener1", listener);

        broadcaster.broadcast(message);
        expect(spy1).to.not.have.been.called;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to send a payload on the broadcast", () => {
        const broadcaster = new InMemoryGossip();
        const listener = new InMemoryGossip();
        const spy = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener.subscribe(message, spy);
        broadcaster.registerRemoteMessagesListener("listener1", listener);

        broadcaster.broadcast(message, payload);
        expect(spy).to.have.been.calledWith(payload);
    });

    it("should be able to unicast a message to a single client", () => {
        const broadcaster = new InMemoryGossip();
        const listener1 = new InMemoryGossip();
        const listener2 = new InMemoryGossip();
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);
        broadcaster.registerRemoteMessagesListener("listener1", listener1);
        broadcaster.registerRemoteMessagesListener("listener2", listener2);

        broadcaster.unicast("listener1", message, payload);
        expect(spy1).to.have.been.calledWith(payload);
        expect(spy2).to.not.have.been.calledWith(payload);
    });
});