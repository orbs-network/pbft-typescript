import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { InMemoryGossip } from "./InMemoryGossip";
import { InMemoryGossipDiscovery } from "./InMemoryGossipDiscovery";

chai.use(sinonChai);

describe("InMemory Gossip Discovery", () => {
    const genId = () => Math.random().toString();

    it("should create an instance", () => {
        const instance = new InMemoryGossipDiscovery();

        expect(instance).to.not.be.undefined;
    });

    it("should be able to get an InMemoryGossip instance from an id", () => {
        const id = genId();
        const gossip = new InMemoryGossip(id);
        const instance = new InMemoryGossipDiscovery();
        instance.registerGossip(id, gossip);
        const result = instance.getGossipById(id);

        expect(gossip).to.equal(result);
    });
});