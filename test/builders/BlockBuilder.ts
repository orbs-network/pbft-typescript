import { Block } from "../../src/Block";

export function aBlock(previousBlock: Block, body: any = Math.random()): Block {
    return {
        header: {
            prevBlockHash: previousBlock.header.hash
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
