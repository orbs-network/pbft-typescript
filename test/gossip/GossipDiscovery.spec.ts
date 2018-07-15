import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Gossip } from "./Gossip";
import { GossipDiscovery } from "./GossipDiscovery";

chai.use(sinonChai);

describe("Gossip Discovery", () => {
    const genId = () => Math.random().toString();

    it("should create an instance", () => {
        const instance = new GossipDiscovery();

        expect(instance).to.not.be.undefined;
    });

    it("should be able to get an Gossip instance from an id", () => {
        const id = genId();
        const discovery = new GossipDiscovery();
        const gossip = new Gossip(discovery);
        discovery.registerGossip(id, gossip);
        const result = discovery.getGossipByPk(id);

        expect(result).to.equal(gossip);
    });

    it("should be able to get all the gossips ids", () => {
        const id1 = genId();
        const id2 = genId();
        const id3 = genId();
        const discovery = new GossipDiscovery();
        const gossip1 = new Gossip(discovery);
        const gossip2 = new Gossip(discovery);
        const gossip3 = new Gossip(discovery);
        discovery.registerGossip(id1, gossip1);
        discovery.registerGossip(id2, gossip2);
        discovery.registerGossip(id3, gossip3);
        const result = discovery.getAllGossipsPks();

        expect(result).to.deep.equal([id1, id2, id3]);
    });

    it("should return undefined if a given id was not registered", () => {
        const id = genId();
        const discovery = new GossipDiscovery();
        const result = discovery.getGossipByPk(id);

        expect(result).to.be.undefined;
    });

    it("should return a list of all the gossips", () => {
        const discovery = new GossipDiscovery();
        const id1 = genId();
        const id2 = genId();
        const gossip1 = new Gossip(discovery);
        const gossip2 = new Gossip(discovery);
        discovery.registerGossip(id1, gossip1);
        discovery.registerGossip(id2, gossip2);
        const result = discovery.getGossips();

        expect(result).to.deep.equal([gossip1, gossip2]);
    });

    it("should return a list of the requested gossips", () => {
        const discovery = new GossipDiscovery();
        const id1 = genId();
        const id2 = genId();
        const id3 = genId();
        const gossip1 = new Gossip(discovery);
        const gossip2 = new Gossip(discovery);
        const gossip3 = new Gossip(discovery);
        discovery.registerGossip(id1, gossip1);
        discovery.registerGossip(id2, gossip2);
        discovery.registerGossip(id3, gossip3);
        const result = discovery.getGossips([id1, id3]);

        expect(result).to.deep.equal([gossip1, gossip3]);
    });
});