/// <reference types="chai" />
/// <reference types="sinon" />


declare global {
    export namespace Chai {
        interface Assertion {
            reachConsensusOnBlock(block: any): Assertion;
        }
    }
}

declare function gilChai(chai: any, utils: any): void;
declare namespace gilChai { }
export = gilChai;

