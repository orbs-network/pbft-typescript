import { Block } from "../Block";
import { ViewChangePayload } from "../networkCommunication/Payload";

export function extractBlock(VCProof: ViewChangePayload[]): Block {
    const filteredProofs = VCProof
        .filter(vc => vc.data.preparedProof !== undefined)
        .filter(vc => vc.data.preparedProof.prepreparePayload !== undefined)
        .map(vc => vc.data.preparedProof.prepreparePayload)
        .sort((a, b) => b.data.view - a.data.view);

    if (filteredProofs.length > 0) {
        return filteredProofs[0].block;
    } else {
        return undefined;
    }
}