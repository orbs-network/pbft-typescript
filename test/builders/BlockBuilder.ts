import { Block } from "../../src/Block";
import { calculateBlockHash } from "../../src/blockUtils/BlockUtils";

const genBody = () => (Math.floor(Math.random() * 100_000_000)).toString();

export function aBlock(previousBlock: Block, body: any = genBody()): Block {
    return {
        header: {
            height: previousBlock.header.height + 1,
            prevBlockHash: calculateBlockHash(previousBlock)
        },
        body
    };
}

export const theGenesisBlock: Block = {
    header: {
        height: 0,
        prevBlockHash: new Buffer("0")
    },
    body: "The Genesis Block"
};
