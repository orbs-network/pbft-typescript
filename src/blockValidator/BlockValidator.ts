import { Block } from "../Block";

export interface BlockValidator {
    validateBlock: (block: Block) => Promise<boolean>;
}