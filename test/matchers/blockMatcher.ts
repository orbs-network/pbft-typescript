import { Block } from "../../src/Block";
import { Node } from "../network/Node";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", async function (block: Block) {
        const nodes: Node[] = this._obj;
        const blockHash: string = BlockUtils.calculateBlockHash(block);

        const promises = nodes.map(async (node) => {
            const latestBlock: Block = await node.getLatestBlock();
            const latestBlockHash = BlockUtils.calculateBlockHash(latestBlock);
            return latestBlockHash === blockHash;
          });
        const results = await Promise.all(promises);
        const hasConsensus = results.every(r => r);
        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block body:${block.body}`
            , "expected #{this} to not reach consensus"
        );
    });
};
