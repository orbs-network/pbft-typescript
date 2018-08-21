import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

let globalCounter: number = 0;
const genContent = () => `Block ${(globalCounter++).toString()}`;

export function aBlock(previousBlock: Block, content: any = genContent()): Block {
    const result: Block = {
        header: {
            height: previousBlock.header.height + 1,
            blockHash: Buffer.from(content)
        }
    };
    (result as any).body = content;

    return result;
}

export const theGenesisBlock: Block = {
    header: {
        height: 0,
        blockHash: Buffer.from("The Genesis Block")
    }
};
