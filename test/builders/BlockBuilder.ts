import { Block } from "../../src/Block";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";

const genBody = () => (Math.floor(Math.random() * 100_000_000)).toString();

export function aBlock(previousBlock: Block, body: any = genBody()): Block {
    return {
        header: {
            prevBlockHash: BlockUtils.calculateBlockHash(previousBlock)
        },
        body
    };
}

export const theGenesisBlock: Block = {
    header: {
        prevBlockHash: "0"
    },
    body: "The Genesis Block"
};
