import { Block } from "../../src/Block";

export function aBlock(previousBlock: Block): Block {
    return {
        header: {
            prevBlockHash: previousBlock.header.hash,
            hash: Math.floor(Math.random() * 1_000_000).toString()
        }
    };
}

export const theGenesisBlock: Block = {
    header: {
        prevBlockHash: "0",
        hash: "00000"
    }
};
