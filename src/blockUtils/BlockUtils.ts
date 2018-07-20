import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import { Block } from "../Block";
import { BlocksProvider } from "../blocksProvider/BlocksProvider";
import { BlocksValidator } from "../blocksValidator/BlocksValidator";

export const calculateBlockHash = (block: Block): string => createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest("base64");

export class BlockUtils {
    private lastCommittedBlockHash: string;

    public constructor(
        private readonly blockValidator: BlocksValidator,
        private readonly blockProvider: BlocksProvider) {
    }

    public setLastCommittedBlockHash(lastCommittedBlockHash: string): void {
        this.lastCommittedBlockHash = lastCommittedBlockHash;
    }

    public async requestNewBlock(height: number): Promise<Block> {
        const newBlock: Block = await this.blockProvider.requestNewBlock(height);
        newBlock.header.prevBlockHash = this.lastCommittedBlockHash;
        return newBlock;
    }

    public async validateBlock(block: Block): Promise<boolean> {
        if (this.lastCommittedBlockHash !== block.header.prevBlockHash) {
            return false;
        }
        return this.blockValidator.validateBlock(block);
    }
}

