import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { InMemoryGossip } from "./InMemoryGossip";

chai.use(sinonChai);

describe("InMemory Gossip", () => {
    const genId = () => Math.random().toString();

    it("should be able to broadcast a message to a subscribed client", () => {
        const listener = new InMemoryGossip(genId());
        const broadcaster = new InMemoryGossip(genId());
        const spy = sinon.spy();
        const message = Math.random().toString();

        listener.subscribe(message, spy);
        broadcaster.registerRemoteMessagesListener(listener);
        broadcaster.broadcast(message);

        expect(spy).to.have.been.calledOnce;
    });

    it("should be able to broadcast a message to many clients", () => {
        const listener1 = new InMemoryGossip(genId());
        const listener2 = new InMemoryGossip(genId());
        const broadcaster = new InMemoryGossip(genId());
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);

        broadcaster.registerRemoteMessagesListener(listener1);
        broadcaster.registerRemoteMessagesListener(listener2);
        broadcaster.broadcast(message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should get called only for the requested message", () => {
        const broadcaster = new InMemoryGossip(genId());
        const listener = new InMemoryGossip(genId());
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message1 = Math.random().toString();
        const message2 = Math.random().toString();
        listener.subscribe(message1, spy1);
        listener.subscribe(message2, spy2);

        broadcaster.registerRemoteMessagesListener(listener);
        broadcaster.broadcast(message1);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.not.have.been.calledOnce;
    });

    it("should be able to unsubscribe", () => {
        const broadcaster = new InMemoryGossip(genId());
        const listener = new InMemoryGossip(genId());
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        const subscriptionToken = listener.subscribe(message, spy1);
        listener.subscribe(message, spy2);
        listener.unsubscribe(subscriptionToken);
        broadcaster.registerRemoteMessagesListener(listener);

        broadcaster.broadcast(message);
        expect(spy1).to.not.have.been.called;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to send a payload on the broadcast", () => {
        const senderId = genId();
        const broadcaster = new InMemoryGossip(senderId);
        const listener = new InMemoryGossip(genId());
        const spy = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener.subscribe(message, spy);
        broadcaster.registerRemoteMessagesListener(listener);

        broadcaster.broadcast(message, payload);
        expect(spy).to.have.been.calledWith(senderId, payload);
    });

    it("should be able to unicast a message to a single client", () => {
        const broadcaster = new InMemoryGossip("broadcaster");
        const listener1 = new InMemoryGossip("listener1");
        const listener2 = new InMemoryGossip("listener2");
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);
        broadcaster.registerRemoteMessagesListener(listener1);
        broadcaster.registerRemoteMessagesListener(listener2);

        broadcaster.unicast("listener1", message, payload);
        expect(spy1).to.have.been.calledWith("broadcaster", payload);
        expect(spy2).to.not.have.been.called;
    });
});