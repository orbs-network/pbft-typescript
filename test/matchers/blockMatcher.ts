import { Block } from "../../src/Block";
import { Node } from "../network/Node";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", function (block: Block) {
        const nodes: Node[] = this._obj;
        const hasConsensus = nodes.every(n => n.getLatestBlock() && n.getLatestBlock().hash === block.hash);

        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block ${block.content}`
            , "expected #{this} to not reach consensus"
        );
    });
};