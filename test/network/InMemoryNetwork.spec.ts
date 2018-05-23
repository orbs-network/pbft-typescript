import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { aNetwork } from "../builders/NetworkBuilder";
import { aLoyalNode } from "../builders/NodeBuilder";
import { InMemoryNetwork } from "./InMemoryNetwork";

chai.use(sinonChai);

describe("Network", () => {
    it("should be able to register nodes", () => {
        const network = new InMemoryNetwork();
        const node1 = aLoyalNode().thatIsPartOf(network).build();
        const node2 = aLoyalNode().thatIsPartOf(network).build();
        network.registerNode(node1);
        network.registerNode(node2);
        expect(network.nodes[0]).to.equal(node1);
        expect(network.nodes[1]).to.equal(node2);
        network.shutDown();
    });

    it("should be able to register several nodes in the same call", () => {
        const network = new InMemoryNetwork();
        const node1 = aLoyalNode().thatIsPartOf(network).build();
        const node2 = aLoyalNode().thatIsPartOf(network).build();
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

});