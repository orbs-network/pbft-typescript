/// <reference types="chai" />
/// <reference types="sinon" />


declare global {
    export namespace Chai {
        interface Assertion {
            agreeOnBlock(block: any): Assertion;
        }
    }
}

declare function PBFTChai(chai: any, utils: any): void;
export = PBFTChai;


