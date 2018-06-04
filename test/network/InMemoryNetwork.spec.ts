import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { aNetwork } from "../builders/NetworkBuilder";
import { aNode } from "../builders/NodeBuilder";
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
        const node1 = aNode().thatIsPartOf(network).communicatesVia(gossip1).build();
        const node2 = aNode().thatIsPartOf(network).communicatesVia(gossip2).build();
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
        const node1 = aNode().thatIsPartOf(network).communicatesVia(gossip1).build();
        const node2 = aNode().thatIsPartOf(network).communicatesVia(gossip2).build();
        network.registerNodes([node1, node2]);
        expect(network.nodes[0]).to.equal(node1);
        expect(network.nodes[1]).to.equal(node2);
        network.shutDown();
    });

    it("should return the total number of nodes when calling getNodesCount", () => {
        const network = aNetwork().with(3).nodes.build();
        expect(network.getNodesCount()).to.equal(3);
        network.shutDown();
    });

    it("should return a node by a given seed (Cycling the nodes using modulo)", () => {
        const network = aNetwork().with(3).nodes.build();
        expect(network.getNodeIdBySeed(0)).to.equal(network.nodes[0].id);
        expect(network.getNodeIdBySeed(1)).to.equal(network.nodes[1].id);
        expect(network.getNodeIdBySeed(2)).to.equal(network.nodes[2].id);
        expect(network.getNodeIdBySeed(3)).to.equal(network.nodes[0].id);
        network.shutDown();
    });

    it("should dipose all the nodes on shutdown", () => {
        const network = aNetwork().with(3).nodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const spy0 = sinon.spy(node0.pbft, "dispose");
        const spy1 = sinon.spy(node1.pbft, "dispose");
        const spy2 = sinon.spy(node2.pbft, "dispose");

        network.shutDown();
        expect(spy0).to.have.been.called;
        expect(spy1).to.have.been.called;
        expect(spy2).to.have.been.called;
    });

    it("should start all the nodes when calling start", () => {
        const network = aNetwork().with(3).nodes.build();
        const node0 = network.nodes[0];
        const node1 = network.nodes[1];
        const node2 = network.nodes[2];
        const spy0 = sinon.spy(node0.pbft, "processNextBlock");
        const spy1 = sinon.spy(node1.pbft, "processNextBlock");
        const spy2 = sinon.spy(node2.pbft, "processNextBlock");

        network.processNextBlock();
        expect(spy0).to.have.been.called;
        expect(spy1).to.have.been.called;
        expect(spy2).to.have.been.called;
        network.shutDown();
    });

    it("should return a list of all the nodeIds", () => {
        const network = aNetwork().with(3).nodes.build();
        const result = network.getAllNodesIds();
        expect(result).to.deep.equal([network.nodes[0].id, network.nodes[1].id, network.nodes[2].id]);
        network.shutDown();
    });

});