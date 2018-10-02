import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

let globalCounter: number = 0;
const genBody = () => `Block ${(globalCounter++).toString()}`;

export function aBlock(previousBlock: Block, body: any = genBody()): Block {
    const result: Block = {
        header: {
            height: previousBlock.header.height + 1,
            blockHash: Buffer.from(body)
        }
    };
    (result as any).body = body;

    return result;
}

export const theGenesisBlock: Block = {
    header: {
        height: 0,
        blockHash: Buffer.from("The Genesis Block")
    }
};
