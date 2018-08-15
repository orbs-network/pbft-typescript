/// <reference types="chai" />
/// <reference types="sinon" />

import { Block } from "../../src";


declare global {
    export namespace Chai {
        interface Assertion {
            agreeOnBlock(block: Block): Assertion;
        }
    }
}

declare function PBFTChai(chai: any, utils: any): void;
export = PBFTChai;


