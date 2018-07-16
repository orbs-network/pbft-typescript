import { Block } from "../Block";
import { BlockStorage } from "../blockStorage/BlockStorage";
import { BlocksProvider } from "../blocksProvider/BlocksProvider";
import { BlocksValidator } from "../blocksValidator/BlocksValidator";
import * as stringify from "json-stable-stringify";
import { createHash } from "crypto";

export class BlockUtils {
    public constructor(
        private readonly blockValidator: BlocksValidator,
        private readonly blockProvider: BlocksProvider,
        private readonly blockStorage: BlockStorage) {
    }

    public requestNewBlock(height: number): Promise<Block> {
        return this.blockProvider.requestNewBlock(height);
    }

    public async validateBlock(block: Block): Promise<boolean> {
        const lastBlock: Block = await this.blockStorage.getLastBlock();
        const lastBlockHash: string = BlockUtils.calculateBlockHash(lastBlock);
        if (lastBlockHash !== block.header.prevBlockHash) {
            return false;
        }
        return this.blockValidator.validateBlock(block);
    }

    public static calculateBlockHash(block: Block): string {
        return createHash("sha256").update(stringify(block.header)).digest("base64");
    }
}

