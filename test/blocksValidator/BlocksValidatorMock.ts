import { Block } from "../../src/Block";
import { BlocksValidator } from "../../src/blocksValidator/BlocksValidator";

export class BlocksValidatorMock implements BlocksValidator {
    private promiseList: Promise<boolean>[] = [];
    private resolveList: Function[] = [];

    constructor() {

    }

    public async resolveLastValidation(isValid: boolean): Promise<any> {
        if (this.resolveList.length === 0) {
            return Promise.resolve();
        }

        const resolve = this.resolveList.pop();
        const promise = this.promiseList.pop();
        resolve(isValid);
        return promise;
    }

    public async resolveAllValidations(isValid: boolean): Promise<any> {
        this.resolveList.forEach(f => f(isValid));
        this.resolveList = [];
        await this.afterAllValidations();
    }

    private afterAllValidations(): Promise<any> {
        const result = Promise.all(this.promiseList);
        this.promiseList = [];
        return result;
    }

    public validateBlock(block: Block): Promise<boolean> {
        const promise = new Promise<boolean>((resolve, reject) => {
            this.resolveList.push(resolve);
        });
        this.promiseList.push(promise);
        return promise;
    }
}