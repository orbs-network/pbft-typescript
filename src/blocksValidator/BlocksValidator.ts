import { Block } from "../Block";

export interface BlocksValidator {
    validateBlock: (block: Block) => Promise<boolean>;
}