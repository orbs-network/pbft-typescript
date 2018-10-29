import { createHash } from "crypto";
import { Block } from "../../src/Block";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";
import { aBlock, BlockMock, theGenesisBlock } from "../builders/BlockBuilder";

export function calculateBlockHash(block: Block): Buffer {
    const mockBlock = block as BlockMock;
    return createHash("sha256").update(mockBlock.getHeight().toString()).update(mockBlock.getBody()).digest();
}

export class BlockUtilsMock implements BlockUtils {
    private blocksPromiseList: Promise<Block>[] = [];
    private blocksResolveList: Function[] = [];
    private upCommingBlocks: Block[] = [];
    private latestBlock: Block = theGenesisBlock;

    private validationsPromiseList: Promise<boolean>[] = [];
    private validationsResolveList: Function[] = [];

    public constructor(upCommingBlocks?: Block[]) {
        if (upCommingBlocks !== undefined) {
            this.upCommingBlocks = upCommingBlocks;
        }
    }

    public async provideNextBlock(): Promise<void> {
        if (this.blocksResolveList.length === 0) {
            return Promise.resolve();
        }

        const resolve = this.blocksResolveList.pop();
        const promise = this.blocksPromiseList.pop();
        resolve(this.getNextBlock());
        await promise;
    }

    public requestNewBlock(): Promise<Block> {
        const promise = new Promise<Block>(resolve => {
            this.blocksResolveList.push(resolve);
        });

        this.blocksPromiseList.push(promise);
        return promise;
    }

    public getLatestBlock(): Block {
        return this.latestBlock;
    }

    private getNextBlock(): Block {
        let result: Block;
        if (this.upCommingBlocks.length > 0) {
            result = this.upCommingBlocks.shift();
        } else {
            result = aBlock(this.latestBlock);
        }

        this.latestBlock = result;
        return result;
    }

    public async resolveAllValidations(isValid: boolean): Promise<void> {
        this.validationsResolveList.forEach(f => f(isValid));
        this.validationsResolveList = [];
        await this.afterAllValidations();
    }

    private async afterAllValidations(): Promise<void> {
        const promiseList = this.validationsPromiseList;
        this.validationsPromiseList = [];
        await Promise.all(promiseList);
    }

    public validateBlock(block: Block): Promise<boolean> {
        const promise = new Promise<boolean>(resolve => {
            this.validationsResolveList.push(resolve);
        });
        this.validationsPromiseList.push(promise);
        return promise;
    }

    public calculateBlockHash(block: Block): Buffer {
        return calculateBlockHash(block);
    }
}

