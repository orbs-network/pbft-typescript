import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import { Block } from "../../src/Block";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";
import { BlocksValidatorMock } from "../blocksValidator/BlocksValidatorMock";
import { theGenesisBlock, aBlock } from "../builders/BlockBuilder";
import { nextTick } from "../timeUtils";

export const calculateBlockHash = (block: Block): Buffer => createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest(); // .digest("base64");

export class BlockUtilsMock implements BlockUtils {
    private blocksPool = theGenesisBlock;
    private blocksPromiseList: Promise<Block>[] = [];
    private blocksResolveList: Function[] = [];
    private upCommingBlocks: Block[] = [];

    public constructor(
        public readonly blockValidator: BlocksValidatorMock,
        upCommingBlocks?: Block[]) {
        if (upCommingBlocks !== undefined) {
            this.upCommingBlocks = [...upCommingBlocks];
        }
    }

    public async provideNextBlock(): Promise<any> {
        if (this.blocksResolveList.length === 0) {
            return Promise.resolve();
        }

        const resolve = this.blocksResolveList.pop();
        const promise = this.blocksPromiseList.pop();
        resolve(this.getNextBlock());
        await promise;
        return nextTick;
    }

    public requestNewBlock(): Promise<Block> {
        const promise = new Promise<Block>(resolve => {
            this.blocksResolveList.push(resolve);
        });

        this.blocksPromiseList.push(promise);
        return promise;
    }

    private getNextBlock(): Block {
        if (this.upCommingBlocks.length > 0) {
            return this.upCommingBlocks.shift();
        } else {
            return aBlock(this.blocksPool);
        }
    }
    public async validateBlock(block: Block): Promise<boolean> {
        return this.blockValidator.validateBlock(block);
    }

    public calculateBlockHash(block: Block): Buffer {
        return calculateBlockHash(block);
    }
}

