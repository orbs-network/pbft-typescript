import { Block } from "../../src/Block";
import { InMemoryNetwork } from "../network/InMemoryNetwork";
import { LoyalNode } from "../network/LoyalNode";

export const consensusMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("reachConsensusOnBlock", function (block: Block) {
        const network: InMemoryNetwork = this._obj;
        const hasConsensus: boolean = network.nodes
            .filter(node => node.constructor === LoyalNode)
            .every(node => node.getLatestBlock() !== undefined && node.getLatestBlock().hash === block.hash);

        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block ${block.hash}`
            , "expected #{this} to not reach consensus"
        );
    });
};