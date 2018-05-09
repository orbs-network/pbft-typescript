import * as chai from "chai";
import { expect } from "chai";
import * as sinonChai from "sinon-chai";
import { Network } from "./Network";
import { LoyalNode } from "./LoyalNode";

chai.use(sinonChai);

describe.only("Network", () => {
    it("should allow to create a network", () => {
        const network = new Network();
        expect(network).not.to.be.undefined;
    });

    it("should be able to register nodes", () => {
        const network = new Network();
        const node1 = new LoyalNode(2, "node1");
        const node2 = new LoyalNode(2, "node2");
        network.registerNode(node1);
        network.registerNode(node2);
        expect(network.nodes[0]).to.equal(node1);
        expect(network.nodes[1]).to.equal(node2);
    });

    it("should return the node index by its publicKey", () => {
        const network = new Network();
        const node1 = new LoyalNode(3, "node1");
        const node2 = new LoyalNode(3, "node2");
        const node3 = new LoyalNode(3, "node3");
        network.registerNode(node1);
        network.registerNode(node2);
        network.registerNode(node3);
        const result = network.getNodeIdxByPublicKey("node2");
        expect(result).to.equal(1);
    });

});