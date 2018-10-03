import { Block } from "../../src/Block";
import { createHash } from "crypto";

let globalCounter: number = 0;
const genBody = () => `Block ${(globalCounter++).toString()}`;

export class BlockMock implements Block {
    private readonly blockHash: Buffer;

    constructor(private readonly height: number, private readonly body: string) {
        this.height = height;
        this.body = body;
        this.blockHash = this.calculateBlockHash();
    }

    getHeight(): number {
        return this.height;
    }

    getBlockHash(): Buffer {
        return this.blockHash;
    }

    calculateBlockHash(): Buffer {
        return createHash("sha256").update(this.height.toString()).update(this.body).digest();
    }
}

export function aBlock(previousBlock: Block, body: string = genBody()): Block {
    return new BlockMock(previousBlock.getHeight() + 1, body);
}

export const theGenesisBlock: Block = new BlockMock(0, "The Genesis Block");
