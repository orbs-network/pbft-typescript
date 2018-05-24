import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { aNetwork } from "../builders/NetworkBuilder";
import { aLoyalNode } from "../builders/NodeBuilder";
import { InMemoryGossip } from "../gossip/InMemoryGossip";
import { InMemoryGossipDiscovery } from "../gossip/InMemoryGossipDiscovery";
import { InMemoryNetwork } from "./InMemoryNetwork";

chai.use(sinonChai);

describe("InMemory Network", () => {
    it("should be able to register nodes", () => {
        const network = new InMemoryNetwork();
        const discovery = new InMemoryGossipDiscovery();
        const gossip1 = new InMemoryGossip(discovery);
        const gossip2 = new InMemoryGossip(discovery);
        discovery.registerGossip("node1", gossip1);
        discovery.registerGossip("node2", gossip2);
        const node1 = aLoyalNode().thatIsPartOf(network).communicatesVia(gossip1).build();
        const node2 = aLoyalNode().thatIsPartOf(network).communicatesVia(gossip2).build();
        network.registerNode(node1);
        network.registerNode(node2);
        expect(network.nodes[0]).to.equal(node1);
        expect(network.nodes[1]).to.equal(node2);
        network.shutDown();
    });

    it("should be able to register several nodes in the same call", () => {
        const network = new InMemoryNetwork();
        const discovery = new InMemoryGossipDiscovery();
        const gossip1 = new InMemoryGossip(discovery);
        const gossip2 = new InMemoryGossip(discovery);
        discovery.registerGossip("node1", gossip1);
        discovery.registerGossip("node2", gossip2);
        const node1 = aLoyalNode().thatIsPartOf(network).communicatesVia(gossip1).build();
        const node2 = aLoyalNode().thatIsPartOf(network).communicatesVia(gossip2).build();
        network.registerNodes([node1, node2]);
        expect(network.nodes[0]).to.equal(node1);
        expect(network.nodes[1]).to.equal(node2);
        network.shutDown();
    });

    it("should return the total number of nodes when calling getNodesCount", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(2).loyalNodes.build();
        expect(network.getNodesCount()).to.equal(3);
        network.shutDown();
    });

    it("should return a node by a given seed (Cycling the nodes using modulo)", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(2).loyalNodes.build();
        expect(network.getNodeIdBySeed(0)).to.equal(network.nodes[0].id);
        expect(network.getNodeIdBySeed(1)).to.equal(network.nodes[1].id);
        expect(network.getNodeIdBySeed(2)).to.equal(network.nodes[2].id);
        expect(network.getNodeIdBySeed(3)).to.equal(network.nodes[0].id);
        network.shutDown();
    });

    it("should return a list of all the nodeIds", () => {
        const network = aNetwork().leadBy.a.loyalLeader.with(2).loyalNodes.build();
        const result = network.getAllNodesIds();
        expect(result).to.deep.equal([network.nodes[0].id, network.nodes[1].id, network.nodes[2].id]);
        network.shutDown();
    });

});