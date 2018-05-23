import { Block } from "../../src/Block";
import { PrePreparePayload } from "../../src/gossip/Payload";
import { LoyalNode } from "./LoyalNode";
import { Node } from "./Node";

export class ByzantineNode extends LoyalNode {

    public suggestBlockTo(block: Block, ...nodes: Node[]): void {
        nodes.forEach(node => {
            const payload: PrePreparePayload = {
                block,
                view: 0
            };
            this.pbft.gossip.unicast(this.id, node.id, "preprepare", payload);
        });
    }

    public onNewBlock(block: Block): void {
        this.blockLog.push({ content: "FOO BAR", hash: "DUMMY", previousBlockHash: "NOTHING" });
    }
}