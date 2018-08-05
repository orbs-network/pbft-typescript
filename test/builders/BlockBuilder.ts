import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

let globalCounter: number = 0;
const genBody = () => `Block ${(globalCounter++).toString()}`;

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
        prevBlockHash: Buffer.from("0")
    },
    body: "The Genesis Block"
};
