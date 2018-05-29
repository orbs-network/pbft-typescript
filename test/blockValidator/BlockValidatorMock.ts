import { Block } from "../../src/Block";
import { BlockValidator } from "../../src/blockValidator/BlockValidator";

export class BlockValidatorMock implements BlockValidator {
    private resolveFunc: Function;

    constructor(private autoResolve: boolean = true) {

    }

    public resolve() {
        this.resolveFunc(true);
    }

    public reject() {
        this.resolveFunc(false);
    }

    public validateBlock(block: Block): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.autoResolve) {
                resolve(true);
            } else {
                this.resolveFunc = resolve;
            }
        });
    }
}