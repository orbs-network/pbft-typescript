import { Block } from "../../src/Block";

export function aBlock(previousBlock: Block, content?: string): Block {
    return {
        previousBlockHash: previousBlock.hash,
        hash: Math.floor(Math.random() * 1_000_000).toString(),
        content: content || Math.floor(Math.random() * 1_000_000).toString()
    };
}

export const theGenesisBlock: Block = {
    previousBlockHash: "0",
    hash: "00000",
    content: ""
};
