import { Block } from "../../src";
import { PreparedProof } from "../../src/storage/PBFTStorage";
import { Node } from "../network/Node";
import { aPrePreparePayload, aPreparePayload } from "./PayloadBuilder";

export function anEmptyPreparedProof(): PreparedProof {
    return {
        prepreparePayload: undefined,
        preparePayloads: undefined
    };
}

export function aPreparedProof(leader: Node, members: Node[], term: number, view: number, block: Block): PreparedProof {
    const result: PreparedProof = {
        prepreparePayload: aPrePreparePayload(leader.config.keyManager, term, view, block),
        preparePayloads: members.map(m => aPreparePayload(m.config.keyManager, term, view, block))
    };

    return result;
}
