import { Block } from "../Block";

export interface BlocksProvider {
    requestNewBlock(height: number): Promise<Block>;
}