import { createHash } from "crypto";
import * as stringify from "json-stable-stringify";
import { Block } from "../../src/Block";
import { BlockUtils } from "../../src/blockUtils/BlockUtils";
import { theGenesisBlock, aBlock } from "../builders/BlockBuilder";
import { nextTick } from "../timeUtils";

export const calculateBlockHash = (block: Block): Buffer => createHash("sha256").update(stringify(block.header)).update(stringify(block.body)).digest(); // .digest("base64");

export class BlockUtilsMock implements BlockUtils {
    private blocksPromiseList: Promise<Block>[] = [];
    private blocksResolveList: Function[] = [];
    private upCommingBlocks: Block[] = [];
    private latestBlock: Block = theGenesisBlock;

    private validationsPromiseList: Promise<boolean>[] = [];
    private validationsResolveList: Function[] = [];

    public constructor(upCommingBlocks?: Block[]) {
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

    public async resolveAllValidations(isValid: boolean): Promise<any> {
        this.validationsResolveList.forEach(f => f(isValid));
        this.validationsResolveList = [];
        await this.afterAllValidations();
    }

    private afterAllValidations(): Promise<any> {
        const result = Promise.all(this.validationsPromiseList);
        this.validationsPromiseList = [];
        return result;
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

