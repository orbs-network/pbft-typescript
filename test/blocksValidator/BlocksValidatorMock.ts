import { Block } from "../../src/Block";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";

export class BlocksValidatorMock implements BlocksValidator {
    private validationsPromises: any[] = [];
    private resolveFuncs: Function[] = [];

    constructor(private autoResolve: boolean = true) {

    }

    public resolveValidations(): Promise<any> {
        this.resolveFuncs.forEach(f => f(true));
        return this.afterAllValidations();
    }

    public rejectValidations(): Promise<any> {
        this.resolveFuncs.forEach(f => f(false));
        return this.afterAllValidations();
    }

    private afterAllValidations(): Promise<any> {
        return Promise.all(this.validationsPromises);
    }

    public validateBlock(block: Block): Promise<boolean> {
        const promise = new Promise<boolean>((resolve, reject) => {
            if (this.autoResolve) {
                resolve(true);
            } else {
                this.resolveFuncs.push(resolve);
            }
        });
        this.validationsPromises.push(promise);
        return promise;
    }
}