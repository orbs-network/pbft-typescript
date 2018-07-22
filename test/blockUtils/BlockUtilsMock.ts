import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import { Block } from "../../src/Block";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { BlocksProviderMock } from "../blocksProvider/BlocksProviderMock";

export const calculateBlockHash = (block: Block): Buffer => createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest(); // .digest("base64");

export class BlockUtilsMock implements BlockUtils {
    private lastCommittedBlockHash: Buffer = new Buffer("");

    public constructor(
        public readonly blockValidator: BlocksValidatorMock,
        public readonly blockProvider: BlocksProviderMock) {
    }

    public setLastCommittedBlockHash(lastCommittedBlockHash: Buffer): void {
        this.lastCommittedBlockHash = new Buffer(lastCommittedBlockHash);
    }

    public async requestNewBlock(height: number): Promise<Block> {
        const newBlock: Block = await this.blockProvider.requestNewBlock();
        newBlock.header.prevBlockHash = this.lastCommittedBlockHash;
        return newBlock;
    }

    public async validateBlock(block: Block): Promise<boolean> {
        return this.blockValidator.validateBlock(block);
    }

    public calculateBlockHash(block: Block): Buffer {
        return calculateBlockHash(block);
    }
}

