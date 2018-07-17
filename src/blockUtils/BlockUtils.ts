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

    public async requestNewBlock(height: number): Promise<Block> {
        const lastBlock: Block = await this.blockStorage.getLastBlock();
        const newBlock: Block = await this.blockProvider.requestNewBlock(height);
        newBlock.header.consensus = {
            consensus: "PBFT",
            prevBlockHash: BlockUtils.calculateBlockHash(lastBlock),
            height: height
        };
        return newBlock;
    }

    public async validateBlock(block: Block): Promise<boolean> {
        const lastBlock: Block = await this.blockStorage.getLastBlock();
        const lastBlockHash: string = BlockUtils.calculateBlockHash(lastBlock);
        if (lastBlockHash !== block.header.consensus.prevBlockHash) {
            return false;
        }
        return this.blockValidator.validateBlock(block);
    }

    public static calculateBlockHash(block: Block): string {
        // return createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest("base64");
        return createHash("sha256").update(stringify(block.header)).digest("base64");
    }
}

