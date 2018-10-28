import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";
import { Node } from "../network/Node";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", function (block: Block) {
        const nodes: Node[] = this._obj;
        const blockHash: Buffer = calculateBlockHash(block);

        const results = nodes.map(node => {
            const latestBlock: Block = node.getLatestCommittedBlock();
            const latestBlockHash = calculateBlockHash(latestBlock);
            return latestBlockHash.equals(blockHash);
          });
        const hasConsensus = results.every(r => r);
        this.assert(
            hasConsensus
            , `expected #{this} to reach consensus on block hash:${block.getBlockHash()}`
            , "expected #{this} to not reach consensus"
        );
    });
};
