import { Block } from "../../src/Block";
import { calculateBlockHash } from "../../src/blockUtils/BlockUtils";
import { Node } from "../network/Node";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", function (block: Block) {
        const nodes: Node[] = this._obj;
        const blockHash: string = calculateBlockHash(block);

        const results = nodes.map(node => {
            const latestBlock: Block = node.getLatestCommittedBlock();
            const latestBlockHash = calculateBlockHash(latestBlock);
            return latestBlockHash === blockHash;
          });
        const hasConsensus = results.every(r => r);
        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block body:${block.body}`
            , "expected #{this} to not reach consensus"
        );
    });
};
