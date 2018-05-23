import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { InMemoryGossip } from "./InMemoryGossip";
import { InMemoryGossipDiscovery } from "./InMemoryGossipDiscovery";

chai.use(sinonChai);

describe("InMemory Gossip", () => {
    const genId = () => Math.random().toString();

    it("should be able to broadcast a message to a subscribed client", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy = sinon.spy();
        const message = Math.random().toString();

        listener.subscribe(message, spy);
        broadcaster.broadcast(broadcasterId, message);

        expect(spy).to.have.been.calledOnce;
    });

    it("should be able to broadcast a message to many clients", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listener1Id = genId();
        const listener2Id = genId();
        const broadcasterId = genId();
        const listener1 = new InMemoryGossip(discovery);
        const listener2 = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listener1Id, listener1);
        discovery.registerGossip(listener2Id, listener2);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);

        broadcaster.broadcast(broadcasterId, message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should get called only for the requested message", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message1 = Math.random().toString();
        const message2 = Math.random().toString();
        listener.subscribe(message1, spy1);
        listener.subscribe(message2, spy2);

        broadcaster.broadcast(broadcasterId, message1);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.not.have.been.calledOnce;
    });

    it("should be able to unsubscribe", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        const subscriptionToken = listener.subscribe(message, spy1);
        listener.subscribe(message, spy2);
        listener.unsubscribe(subscriptionToken);

        broadcaster.broadcast(broadcasterId, message);
        expect(spy1).to.not.have.been.called;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to send a payload on the broadcast", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener.subscribe(message, spy);

        broadcaster.broadcast(broadcasterId, message, payload);
        expect(spy).to.have.been.calledWith(broadcasterId, payload);
    });

    it("should be able to unicast a message to a single client", () => {
        const discovery = new InMemoryGossipDiscovery();
        const broadcaster = new InMemoryGossip(discovery);
        const listener1 = new InMemoryGossip(discovery);
        const listener2 = new InMemoryGossip(discovery);
        discovery.registerGossip("listener1", listener1);
        discovery.registerGossip("listener2", listener2);
        discovery.registerGossip("broadcaster", broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const payload = Math.random().toString();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);

        broadcaster.unicast("broadcaster", "listener1", message, payload);
        expect(spy1).to.have.been.calledWith("broadcaster", payload);
        expect(spy2).to.not.have.been.called;
    });
});