import { NetworkCommunication } from "../../src/networkCommunication/NetworkCommunication";
import { Gossip } from "../gossip/Gossip";
import { GossipDiscovery } from "../gossip/GossipDiscovery";
import { PrePreparePayload, PreparePayload, CommitPayload, ViewChangePayload, NewViewPayload } from "../../src/networkCommunication/Payload";

export class InMemoryNetworkCommunicaiton implements NetworkCommunication {
    private PPCallback: (payload: PrePreparePayload) => void;
    private PCallback: (payload: PreparePayload) => void;
    private CCallback: (payload: CommitPayload) => void;
    private VCCallback: (payload: ViewChangePayload) => void;
    private NVCallback: (payload: NewViewPayload) => void;

    constructor(private discovery: GossipDiscovery, private gossip: Gossip) {
        this.gossip.subscribe((messageType: string, payload: any) => this.onGossipMessage(messageType, payload));
    }

    private onGossipMessage(messageType: string, payload: any): void {
        switch (messageType) {
            case "preprepare": {
                if (this.PPCallback) {
                    this.PPCallback(payload);
                }
                break;
            }
            case "prepare": {
                if (this.PCallback) {
                    this.PCallback(payload);
                }
                break;
            }
            case "commit": {
                if (this.CCallback) {
                    this.CCallback(payload);
                }
                break;
            }
            case "view-change": {
                if (this.VCCallback) {
                    this.VCCallback(payload);
                }
                break;
            }
            case "new-view": {
                if (this.NVCallback) {
                    this.NVCallback(payload);
                }
                break;
            }
        }

    }

    getMembersPKs(seed: number): string[] {
        return this.discovery.getAllGossipsPks();
    }

    sendPrePrepare(pks: string[], payload: PrePreparePayload): void {
        this.gossip.multicast(pks, "preprepare", payload);
    }

    sendPrepare(pks: string[], payload: PreparePayload): void {
        this.gossip.multicast(pks, "prepare", payload);
    }

    sendCommit(pks: string[], payload: CommitPayload): void {
        this.gossip.multicast(pks, "commit", payload);
    }

    sendViewChange(pk: string, payload: ViewChangePayload): void {
        this.gossip.multicast([pk], "view-change", payload);
    }

    sendNewView(pks: string[], payload: NewViewPayload): void {
        this.gossip.multicast(pks, "new-view", payload);
    }

    registerToPrePrepare(cb: (payload: PrePreparePayload) => void): void {
        this.PPCallback = cb;
    }

    registerToPrepare(cb: (payload: PreparePayload) => void): void {
        this.PCallback = cb;
    }

    registerToCommit(cb: (payload: CommitPayload) => void): void {
        this.CCallback = cb;
    }

    registerToViewChange(cb: (payload: ViewChangePayload) => void): void {
        this.VCCallback = cb;
    }

    registerToNewView(cb: (payload: NewViewPayload) => void): void {
        this.NVCallback = cb;
    }

    isMember(pk: string): boolean {
        return this.discovery.getGossipByPk(pk) !== undefined;
    }
}