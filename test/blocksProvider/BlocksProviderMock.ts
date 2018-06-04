import { Block } from "../../src/Block";
import { BlocksProvider } from "../../src/blocksProvider/BlocksProvider";

export class BlocksProviderMock implements BlocksProvider {
    public getBlock(): Block {
        return undefined;
    }
}