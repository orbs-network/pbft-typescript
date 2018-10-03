import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { KeyManager } from "../../src/keyManager/KeyManager";
import { LeanHelixMessage, MessageType } from "../../src/networkCommunication/Messages";
import { KeyManagerMock } from "../keyManager/KeyManagerMock";
import { Gossip } from "./Gossip";
import { GossipDiscovery } from "./GossipDiscovery";

chai.use(sinonChai);

function aLeanHelixMessage(keyManager: KeyManager, content: string): LeanHelixMessage {
    return {
        sender: {
            contentSignature: keyManager.sign(content),
            senderPublicKey: keyManager.getMyPublicKey()
        },
        signedHeader: {
            messageType: MessageType.PREPARE,
            term: Math.floor(Math.random() * 1_000_000),
            view: Math.floor(Math.random() * 1_000_000),
        }
    };
}


describe("Gossip", () => {
    const genPk = () => Math.random().toString();

    it("should be able to broadcast a message to a subscribed client", () => {
        const discovery = new GossipDiscovery();
        const listenerPk = genPk();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerPk, listener);
        discovery.registerGossip(broadcasterPk, broadcaster);
        const spy = sinon.spy();
        const message = aLeanHelixMessage(keyManager, "Data");

        listener.subscribe(spy);
        const pks = discovery.getAllGossipsPks();
        broadcaster.multicast(pks, message);

        expect(spy).to.have.been.calledOnce;
    });

    it("should be able to broadcast a message to many clients", () => {
        const discovery = new GossipDiscovery();
        const listener1Pk = genPk();
        const listener2Pk = genPk();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listener1Pk, listener1);
        discovery.registerGossip(listener2Pk, listener2);
        discovery.registerGossip(broadcasterPk, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = aLeanHelixMessage(keyManager, "Data");
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);
        const pks = discovery.getAllGossipsPks();
        broadcaster.multicast(pks, message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to unicast a message to the given clients", () => {
        const discovery = new GossipDiscovery();
        const listener1Pk = genPk();
        const listener2Pk = genPk();
        const listener3Id = genPk();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        const listener3 = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listener1Pk, listener1);
        discovery.registerGossip(listener2Pk, listener2);
        discovery.registerGossip(listener3Id, listener3);
        discovery.registerGossip(broadcasterPk, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const spy3 = sinon.spy();
        const message = aLeanHelixMessage(keyManager, "Data");
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);
        listener3.subscribe(spy3);

        broadcaster.multicast([listener1Pk, listener2Pk], message);
        expect(spy1).to.have.been.calledOnce;
        expect(spy2).to.have.been.calledOnce;
        expect(spy3).to.not.have.been.calledOnce;
    });

    it("should be able to unsubscribe", () => {
        const discovery = new GossipDiscovery();
        const listenerPk = genPk();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerPk, listener);
        discovery.registerGossip(broadcasterPk, broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const subscriptionToken = listener.subscribe(spy1);
        listener.subscribe(spy2);
        listener.unsubscribe(subscriptionToken);

        const message = aLeanHelixMessage(keyManager, "Data");
        const pks = discovery.getAllGossipsPks();
        broadcaster.multicast(pks, message);
        expect(spy1).to.not.have.been.called;
        expect(spy2).to.have.been.calledOnce;
    });

    it("should be able to send a message on the broadcast", () => {
        const discovery = new GossipDiscovery();
        const listenerPk = genPk();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const listener = new Gossip(discovery);
        const broadcaster = new Gossip(discovery);
        discovery.registerGossip(listenerPk, listener);
        discovery.registerGossip(broadcasterPk, broadcaster);
        const spy = sinon.spy();
        const message = aLeanHelixMessage(keyManager, "Data");
        listener.subscribe(spy);

        const pks = discovery.getAllGossipsPks();
        broadcaster.multicast(pks, message);
        expect(spy).to.have.been.calledWith(message);
    });

    it("should be able to unicast a message to a single client", () => {
        const discovery = new GossipDiscovery();
        const broadcasterPk = genPk();
        const keyManager: KeyManager = new KeyManagerMock(broadcasterPk);
        const broadcaster = new Gossip(discovery);
        const listener1 = new Gossip(discovery);
        const listener2 = new Gossip(discovery);
        discovery.registerGossip("listener1", listener1);
        discovery.registerGossip("listener2", listener2);
        discovery.registerGossip("broadcaster", broadcaster);
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        const message = aLeanHelixMessage(keyManager, "Data");
        listener1.subscribe(spy1);
        listener2.subscribe(spy2);

        broadcaster.unicast("listener1", message);
        expect(spy1).to.have.been.calledWith(message);
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
        const gossip1Pk = genPk();
        const gossip2Pk = genPk();
        const gossip3Pk = genPk();
        const gossip4Pk = genPk();
        const gossip1keyManager: KeyManager = new KeyManagerMock(gossip1Pk);
        const gossip2keyManager: KeyManager = new KeyManagerMock(gossip2Pk);
        const gossip3keyManager: KeyManager = new KeyManagerMock(gossip3Pk);
        const gossip4keyManager: KeyManager = new KeyManagerMock(gossip4Pk);
        let pks: string[];

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
            gossip1.subscribe(spy1);
            gossip2.subscribe(spy2);
            gossip3.subscribe(spy3);
            gossip4.subscribe(spy4);
            pks = discovery.getAllGossipsPks();
        });

        describe("Outgoing white list", () => {
            it("should ignore all messages if outGoing list is empty", () => {
                gossip1.setOutGoingWhiteListPKs([]);

                gossip1.multicast(pks, aLeanHelixMessage(gossip1keyManager, "Data"));
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);

                const msgTo2 = aLeanHelixMessage(gossip1keyManager, "Data");
                const msgTo3 = aLeanHelixMessage(gossip1keyManager, "Data");
                const msgTo4 = aLeanHelixMessage(gossip1keyManager, "Data");
                gossip1.unicast("gossip2", msgTo2);
                gossip1.unicast("gossip3", msgTo3);
                gossip1.unicast("gossip4", msgTo4);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(msgTo3);
                expect(spy4).to.not.have.been.called;
            });

            it("should keep sending messages after the outGoing list was cleared", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);

                const message = aLeanHelixMessage(gossip1keyManager, "Data");
                gossip1.multicast(pks, message);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message);
                expect(spy4).to.not.have.been.called;

                gossip1.clearOutGoingWhiteListPKs();
                gossip1.multicast(pks, message);
                expect(spy2).to.have.been.calledWith(message);
                expect(spy3).to.have.been.calledWith(message);
                expect(spy4).to.have.been.calledWith(message);
            });

            it("should ignore broadcast messages that don't apply to the outgoing white list", () => {
                gossip1.setOutGoingWhiteListPKs(["gossip3"]);
                const message = aLeanHelixMessage(gossip1keyManager, "Data");

                gossip1.multicast(pks, message);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message);
                expect(spy4).to.not.have.been.called;
            });
        });

        describe("Incoming white list", () => {
            it("should ignore all messages if incoming white list is empty", () => {
                gossip2.setIncomingWhiteListPKs([]);
                gossip3.setIncomingWhiteListPKs([]);
                gossip4.setIncomingWhiteListPKs([]);

                const message = aLeanHelixMessage(gossip1keyManager, "Data");
                gossip1.multicast(pks, message);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.not.have.been.called;
                expect(spy4).to.not.have.been.called;
            });

            it("should ignore unicast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteListPKs([gossip2Pk]);

                const message1 = aLeanHelixMessage(gossip1keyManager, "Data");
                const message2 = aLeanHelixMessage(gossip2keyManager, "Data");
                const message3 = aLeanHelixMessage(gossip3keyManager, "Data");
                gossip1.unicast("gossip4", message1);
                gossip2.unicast("gossip4", message2);
                gossip3.unicast("gossip4", message3);
                expect(spy4).to.have.been.calledOnce.calledWith(message2);
            });

            it("should keep sending messages after the incomming list was cleared", () => {
                gossip2.setIncomingWhiteListPKs([]);
                gossip3.setIncomingWhiteListPKs([gossip1Pk]);
                gossip4.setIncomingWhiteListPKs([]);

                const message = aLeanHelixMessage(gossip1keyManager, "Data");
                gossip1.multicast(pks, message);
                expect(spy2).to.not.have.been.called;
                expect(spy3).to.have.been.calledWith(message);
                expect(spy4).to.not.have.been.called;

                gossip2.clearIncommingWhiteListPKs();
                gossip3.clearIncommingWhiteListPKs();
                gossip4.clearIncommingWhiteListPKs();
                gossip1.multicast(pks, message);
                expect(spy2).to.have.been.calledWith(message);
                expect(spy3).to.have.been.calledWith(message);
                expect(spy4).to.have.been.calledWith(message);
            });

            it("should ignore broadcast messages that don't apply to the incoming white list", () => {
                gossip4.setIncomingWhiteListPKs([gossip2Pk]);

                const message1 = aLeanHelixMessage(gossip1keyManager, "Data");
                const message2 = aLeanHelixMessage(gossip2keyManager, "Data");
                gossip1.multicast(pks, message1);
                gossip2.multicast(pks, message2);
                expect(spy4).to.have.been.calledOnce.calledWith(message2);
            });
        });
    });
});