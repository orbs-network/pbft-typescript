import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { Gossip } from "./Gossip";
import { GossipDiscovery } from "./GossipDiscovery";
import { Payload } from "../../src/gossip/Payload";
import { buildPayload } from "../payload/PayloadUtils";

chai.use(sinonChai);

describe("Gossip", () => {
    const genId = () => Math.random().toString();

    it("should be able to broadcast a message to a subscribed client", () => {
        const discovery = new GossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy = sinon.spy();
        const message = Math.random().toString();
        const payload = buildPayload("Data");

        listener.subscribe(spy);
        broadcaster.broadcast(message, payload);

        expect(spy).to.have.been.calledOnce;
    });

    it("should be able to broadcast a message to many clients", () => {
        const discovery = new GossipDiscovery();
        const listener1Id = genId();
        const listener2Id = genId();
        const broadcasterId = genId();
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listener1Id, listener1);
        discovery.registerGossip(listener2Id, listener2);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        const payload = buildPayload("Data");
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);
        broadcaster.broadcast(message, payload);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to unicast a message to the given clients", () => {
        const discovery = new GossipDiscovery();
        const listener1Id = genId();
        const listener2Id = genId();
        const listener3Id = genId();
        const broadcasterId = genId();
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        const listener3 = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listener1Id, listener1);
        discovery.registerGossip(listener2Id, listener2);
        discovery.registerGossip(listener3Id, listener3);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const spy3 = sinon.spy();
        const message = Math.random().toString();
        const payload = buildPayload("Data");
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);
        listener3.subscribe(spy3);

        broadcaster.multicast([listener1Id, listener2Id], message, payload);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
        expect(spy3).to.not.have.been.calledOnce;
    });

    it("should be able to unsubscribe", () => {
        const discovery = new GossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = Math.random().toString();
        const subscriptionToken = listener.subscribe(spy1);
        listener.subscribe(spy2);
        listener.unsubscribe(subscriptionToken);

        broadcaster.broadcast(message, undefined);
        expect(spy1).to.not.have.been.called;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to send a payload on the broadcast", () => {
        const discovery = new GossipDiscovery();
        const listenerId = genId();
        const broadcasterId = genId();
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerId, listener);
        discovery.registerGossip(broadcasterId, broadcaster);
        const spy = sinon.spy();
        const payload = buildPayload("Data");
        const message = Math.random().toString();
        listener.subscribe(spy);

        broadcaster.broadcast(message, payload);
        expect(spy).to.have.been.calledWith(message, broadcasterId, payload);
    });

    it("should be able to unicast a message to a single client", () => {
        const discovery = new GossipDiscovery();
        const broadcaster = new Gossip(discovery);
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        discovery.registerGossip("listener1", listener1);
        discovery.registerGossip("listener2", listener2);
        discovery.registerGossip("broadcaster", broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const payload = buildPayload("Data");
        const message = Math.random().toString();
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);

        broadcaster.unicast("listener1", message, payload);
        expect(spy1).to.have.been.calledWith(message, "broadcaster", payload);
        expect(spy2).to.not.have.been.called;
    });

    describe("White List", () => {
        let discovery: GossipDiscovery;
        let gossip1: Gossip;
        let gossip2: Gossip;
        let gossip3: Gossip;
        let gossip4: Gossip;
        let spy1: sinon.SinonSpy;
        let spy2: sinon.SinonSpy;
        let spy3: sinon.SinonSpy;
        let spy4: sinon.SinonSpy;
        let payload: Payload;
        let message: string;

        beforeEach(() => {
            discovery = new GossipDiscovery();
            gossip1 = new Gossip(discovery);
            gossip2 = new Gossip(discovery);
            gossip3 = new Gossip(discovery);
            gossip4 = new Gossip(discovery);
            discovery.registerGossip("gossip1", gossip1);
            discovery.registerGossip("gossip2", gossip2);
            discovery.registerGossip("gossip3", gossip3);
            discovery.registerGossip("gossip4", gossip4);
            spy1 = sinon.spy();
            spy2 = sinon.spy();
            spy3 = sinon.spy();
            spy4 = sinon.spy();
            payload = { pk: "pk", signature: "signature", data: "Data" };
            message = Math.random().toString();
            gossip1.subscribe(spy1);
            gossip2.subscribe(spy2);
            gossip3.subscribe(spy3);
            gossip4.subscribe(spy4);

        });

        describe("Outgoing white list", () => {
            it("should ignore all messages if outGoing list is empty", () => {
                gossip1.setOutGoingWhiteListPKs([]);

                gossip1.broadcast(message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);

                gossip1.unicast("gossip2", message, payload);
                gossip1.unicast("gossip3", message, payload);
                gossip1.unicast("gossip4", message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.not.have.been.called;
            });

            it("should keep sending messages after the outGoing list was cleared", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);

                gossip1.broadcast(message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.not.have.been.called;

                gossip1.clearOutGoingWhiteListPKs();
                gossip1.broadcast(message, payload);
                expect(spy2).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.have.been.calledWith(message, "gossip1", payload);
            });

            it("should ignore broadcast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);

                gossip1.broadcast(message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.not.have.been.called;
            });
        });

        describe("Incoming white list", () => {
            it("should ignore all messages if incoming white list is empty", () => {
                gossip2.setIncomingWhiteListPKs([]);
                gossip3.setIncomingWhiteListPKs([]);
                gossip4.setIncomingWhiteListPKs([]);

                gossip1.broadcast(message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteListPKs(["gossip2"]);

                gossip1.unicast("gossip4", message, payload);
                gossip2.unicast("gossip4", message, payload);
                gossip3.unicast("gossip4", message, payload);
                expect(spy4).to.have.been.calledOnce.calledWith(message, "gossip2", payload);
            });

            it("should keep sending messages after the incomming list was cleared", () => {
                gossip2.setIncomingWhiteListPKs([]);
                gossip3.setIncomingWhiteListPKs(["gossip1"]);
                gossip4.setIncomingWhiteListPKs([]);

                gossip1.broadcast(message, payload);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.not.have.been.called;

                gossip2.clearIncommingWhiteListPKs();
                gossip3.clearIncommingWhiteListPKs();
                gossip4.clearIncommingWhiteListPKs();
                gossip1.broadcast(message, payload);
                expect(spy2).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy3).to.have.been.calledWith(message, "gossip1", payload);
                expect(spy4).to.have.been.calledWith(message, "gossip1", payload);
            });

            it("should ignore broadcast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteListPKs(["gossip2"]);

                gossip1.broadcast(message, payload);
                gossip2.broadcast(message, payload);
                expect(spy4).to.have.been.calledOnce.calledWith(message, "gossip2", payload);
            });
        });
    });
});