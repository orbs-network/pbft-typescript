import { Block } from "../src/Block";

export function aBlock(previousBlock: Block, content?: string): Block {
    return {
        previousBlockHash: previousBlock.hash,
        hash: Math.random().toString(),
        content: content || Math.random().toString()
    };
}

export const theGenesisBlock: Block = {
    previousBlockHash: "0",
    hash: "00000",
    content: ""
};
