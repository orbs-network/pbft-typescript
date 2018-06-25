import { Block } from "../Block";

export interface BlocksProvider {
    getBlock(): Promise<Block>;
}