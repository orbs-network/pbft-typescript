import { Block } from "../../src/Block";
import { calculateBlockHash } from "../blockUtils/BlockUtilsMock";

let globalCounter: number = 0;
const genBody = () => `Block ${(globalCounter++).toString()}`;

export class BlockMock implements Block {
    private readonly blockHash: Buffer;

    constructor(private readonly height: number, private readonly body: string) {
        this.height = height;
        this.body = body;
        this.blockHash = calculateBlockHash(this);
    }

    getHeight(): number {
        return this.height;
    }

    getBlockHash(): Buffer {
        return this.blockHash;
    }

    getBody(): string {
        return this.body;
    }
}

export function aBlock(previousBlock: Block, body: string = genBody()): Block {
    return new BlockMock(previousBlock.getHeight() + 1, body);
}

export const theGenesisBlock: Block = new BlockMock(0, "The Genesis Block");
