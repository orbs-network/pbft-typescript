import { Block } from "../../src/Block";
import { Node } from "../network/Node";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", async function (block: Block) {
        const nodes: Node[] = this._obj;

        const promises = nodes.map(async (node) => {
            const latestBlock: Block = await node.getLatestBlock();
            return  latestBlock.header.hash === block.header.hash;
          });
        const hasConsensus =  await Promise.all(promises);
        // const hasConsensus = nodes.every(n => n.getLatestBlock() && n.getLatestBlock().hash === block.hash);
        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block hash:${block.header.hash}`
            , "expected #{this} to not reach consensus"
        );
    });
};
