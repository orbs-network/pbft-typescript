import { Block } from "../../src/Block";
import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";
import { nextTick } from "../timeUtils";

export class BlocksProviderMock implements BlocksProvider {
    private blocksPool = theGenesisBlock;
    private promiseList: Promise<Block>[] = [];
    private resolveList: Function[] = [];
    private upCommingBlocks: Block[] = [];

    constructor(upCommingBlocks?: Block[]) {
        if (upCommingBlocks !== undefined) {
            this.setUpcommingBlocks(upCommingBlocks);
        }
    }

    public setUpcommingBlocks(upCommingBlocks: Block[]): void {
        this.upCommingBlocks = [...upCommingBlocks];
    }

    public async provideNextBlock(): Promise<any> {
        if (this.resolveList.length === 0) {
            return Promise.resolve();
        }

        const resolve = this.resolveList.pop();
        const promise = this.promiseList.pop();
        resolve(this.getNextBlock());
        await promise;
        return nextTick;
    }

    public getBlock(): Promise<Block> {
        const promise = new Promise<Block>(resolve => {
            this.resolveList.push(resolve);
        });

        this.promiseList.push(promise);
        return promise;
    }

    private getNextBlock(): Block {
        if (this.upCommingBlocks.length > 0) {
            return this.upCommingBlocks.shift();
        } else {
            return aBlock(this.blocksPool);
        }
    }
}