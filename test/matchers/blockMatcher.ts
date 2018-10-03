import { Block } from "../../src/Block";
import { Node } from "../network/Node";
import { BlockMock } from "../builders/BlockBuilder";

export const blockMatcher = (chai: any, utils: any) => {
    chai.Assertion.addMethod("agreeOnBlock", function (block: BlockMock) {
        const nodes: Node[] = this._obj;
        const blockHash: Buffer = block.calculateBlockHash();

        const results = nodes.map(node => {
            const latestBlock: BlockMock = node.getLatestCommittedBlock() as BlockMock;
            const latestBlockHash = latestBlock.calculateBlockHash();
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
