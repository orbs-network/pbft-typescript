import { Block } from "../Block";

export interface BlockUtils {
    requestNewBlock(height: number): Promise<Block>;
    validateBlock(block: Block): Promise<boolean>;
    calculateBlockHash(block: Block): Buffer;
}