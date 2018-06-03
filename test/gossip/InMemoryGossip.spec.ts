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

    it("should be able to unicast a message to the given clients", () => {
        const discovery = new InMemoryGossipDiscovery();
        const listener1Id = genId();
        const listener2Id = genId();
        const listener3Id = genId();
        const broadcasterId = genId();
        const listener1 = new InMemoryGossip(discovery);
        const listener2 = new InMemoryGossip(discovery);
        const listener3 = new InMemoryGossip(discovery);
        const broadcaster = new InMemoryGossip(discovery);
        discovery.registerGossip(listener1Id, listener1);
        discovery.registerGossip(listener2Id, listener2);
        discovery.registerGossip(listener3Id, listener3);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const spy3 = sinon.spy();
        const message = Math.random().toString();
        listener1.subscribe(message, spy1);
        listener2.subscribe(message, spy2);
        listener3.subscribe(message, spy3);

        broadcaster.multicast(broadcasterId, [listener1Id, listener2Id], message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
        expect(spy3).to.not.have.been.calledOnce;
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

    describe("White List", () => {
        let discovery: InMemoryGossipDiscovery;
        let gossip1: InMemoryGossip;
        let gossip2: InMemoryGossip;
        let gossip3: InMemoryGossip;
        let gossip4: InMemoryGossip;
        let spy1: sinon.SinonSpy;
        let spy2: sinon.SinonSpy;
        let spy3: sinon.SinonSpy;
        let spy4: sinon.SinonSpy;
        let payload: string;
        let message: string;

        beforeEach(() => {
            discovery = new InMemoryGossipDiscovery();
            gossip1 = new InMemoryGossip(discovery);
            gossip2 = new InMemoryGossip(discovery);
            gossip3 = new InMemoryGossip(discovery);
            gossip4 = new InMemoryGossip(discovery);
            discovery.registerGossip("gossip1", gossip1);
            discovery.registerGossip("gossip2", gossip2);
            discovery.registerGossip("gossip3", gossip3);
            discovery.registerGossip("gossip4", gossip4);
            spy1 = sinon.spy();
            spy2 = sinon.spy();
            spy3 = sinon.spy();
            spy4 = sinon.spy();
            payload = Math.random().toString();
            message = Math.random().toString();
            gossip1.subscribe(message, spy1);
            gossip2.subscribe(message, spy2);
            gossip3.subscribe(message, spy3);
            gossip4.subscribe(message, spy4);

        });

        describe("Outgoing white list", () => {
            it("should ignore all messages if outGoing list is empty", () => {
                gossip1.setOutGoingWhiteList([]);

                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteList(["gossip3"]);

                gossip1.unicast("gossip1", "gossip2", message, payload);
                gossip1.unicast("gossip1", "gossip3", message, payload);
                gossip1.unicast("gossip1", "gossip4", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.not.have.been.called;
            });

            it("should keep sending messages after the outGoing list was cleared", () => {
                gossip1.setOutGoingWhiteList(["gossip3"]);

                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.not.have.been.called;

                gossip1.clearOutGoingWhiteList();
                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.have.been.calledWith("gossip1", payload);
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.have.been.calledWith("gossip1", payload);
            });

            it("should ignore broadcast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteList(["gossip3"]);

                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.not.have.been.called;
            });
        });

        describe("Incoming white list", () => {
            it("should ignore all messages if incoming white list is empty", () => {
                gossip2.setIncomingWhiteList([]);
                gossip3.setIncomingWhiteList([]);
                gossip4.setIncomingWhiteList([]);

                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteList(["gossip2"]);

                gossip1.unicast("gossip1", "gossip4", message, payload);
                gossip2.unicast("gossip2", "gossip4", message, payload);
                gossip3.unicast("gossip3", "gossip4", message, payload);
                expect(spy4).to.have.been.calledOnce.calledWith("gossip2", payload);
            });

            it("should keep sending messages after the incomming list was cleared", () => {
                gossip2.setIncomingWhiteList([]);
                gossip3.setIncomingWhiteList(["gossip1"]);
                gossip4.setIncomingWhiteList([]);

                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.not.have.been.called;

                gossip2.clearIncommingWhiteList();
                gossip3.clearIncommingWhiteList();
                gossip4.clearIncommingWhiteList();
                gossip1.broadcast("gossip1", message, payload);
                expect(spy2).to.have.been.calledWith("gossip1", payload);
                expect(spy3).to.have.been.calledWith("gossip1", payload);
                expect(spy4).to.have.been.calledWith("gossip1", payload);
            });

            it("should ignore broadcast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteList(["gossip2"]);

                gossip1.broadcast("gossip1", message, payload);
                gossip2.broadcast("gossip2", message, payload);
                expect(spy4).to.have.been.calledOnce.calledWith("gossip2", payload);
            });
        });
    });
});