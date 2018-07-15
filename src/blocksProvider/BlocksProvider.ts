import { Block } from "../Block";

export interface BlocksProvider {
    requestNewBlock(height: number): Promise<Block>;
    validateBlock: (block: Block) => Promise<boolean>;
}