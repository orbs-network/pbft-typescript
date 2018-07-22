import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import { Block } from "../Block";
import { BlocksProvider } from "../blocksProvider/BlocksProvider";
import { BlocksValidator } from "../blocksValidator/BlocksValidator";

export const calculateBlockHash = (block: Block): Buffer => createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest(); // .digest("base64");

// export function calculateBlockHash(block: Block): Buffer {
//     const hash = createHash("sha256");

//     hash.update(stringify(block.header));

//     hash.update(stringify(block.body));
//     // hash.update(stringify(block));
//     return hash.digest();
// }
export class BlockUtils {
    private lastCommittedBlockHash: Buffer = new Buffer("");

    public constructor(
        private readonly blockValidator: BlocksValidator,
        private readonly blockProvider: BlocksProvider) {
    }

    public setLastCommittedBlockHash(lastCommittedBlockHash: Buffer): void {
        this.lastCommittedBlockHash = new Buffer(lastCommittedBlockHash);
    }

    public async requestNewBlock(height: number): Promise<Block> {
        const newBlock: Block = await this.blockProvider.requestNewBlock(height);
        newBlock.header.prevBlockHash = this.lastCommittedBlockHash;
        return newBlock;
    }

    public async validateBlock(block: Block): Promise<boolean> {
        if (!this.lastCommittedBlockHash.equals(block.header.prevBlockHash)) {
            return false;
        }
        return this.blockValidator.validateBlock(block);
    }
}

