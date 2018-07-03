import { Block } from "../../src/Block";
import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";
import { aBlock, theGenesisBlock } from "../builders/BlockBuilder";

export class BlocksProviderMock implements BlocksProvider {
    private blocksPool = theGenesisBlock;
    private blocksProvidingPromises: any[] = [];
    private upCommingBlocks: Block[] = [];

    constructor(upCommingBlocks?: Block[]) {
        if (upCommingBlocks !== undefined) {
            this.setUpcommingBlocks(upCommingBlocks);
        }
    }

    public setUpcommingBlocks(upCommingBlocks: Block[]): void {
        this.upCommingBlocks = [...upCommingBlocks];
    }

    public afterAllBlocksProvided(): Promise<any> {
        return Promise.all(this.blocksProvidingPromises);
    }

    public getBlock(): Promise<Block> {
        const promise = new Promise<Block>((resolve, reject) => {
            if (this.upCommingBlocks.length > 0) {
                return resolve(this.upCommingBlocks.shift());
            } else {
                return resolve(aBlock(this.blocksPool));
            }
        });

        this.blocksProvidingPromises.push(promise);
        return promise;
    }
}