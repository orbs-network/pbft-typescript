import { Block } from "../../src/Block";
import { BlockValidator } from "../../src/blockValidator/BlockValidator";

export class BlockValidatorMock implements BlockValidator {
    private resolveFuncs: Function[] = [];

    constructor(private autoResolve: boolean = true) {

    }

    public resolve() {
        this.resolveFuncs.forEach(f => f(true));
    }

    public reject() {
        this.resolveFuncs.forEach(f => f(false));
    }

    public validateBlock(block: Block): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.autoResolve) {
                resolve(true);
            } else {
                this.resolveFuncs.push(resolve);
            }
        });
    }
}