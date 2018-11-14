import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

let globalCounter: number = 0;
const genBody = () => `Block ${(++globalCounter).toString()}`;

export class BlockMock implements Block {
    private readonly blockHash: Buffer;

    constructor(private readonly height: number, private readonly body: string) {
        this.height = height;
        this.body = body;
    }

    getHeight(): number {
        return this.height;
    }

    getBody(): string {
        return this.body;
    }
}

export function aBlock(previousBlock: Block, body: string = genBody()): Block {
    const height = previousBlock ? previousBlock.getHeight() + 1 : 0;
    return new BlockMock(height, body);
}

export const theGenesisBlock: Block = aBlock(undefined, "The Genesis Block");
