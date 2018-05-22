import { Block } from "../../src/Block";
import { BlockValidator } from "../../src/blockValidator/BlockValidator";

export class BlockValidatorMock implements BlockValidator {
    public validateBlock(block: Block): Promise<boolean> {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }
}