/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { KeyManager, PBFT } from "../src";
import { Block } from "../src/Block";
import { Config } from "../src/Config";
import { ViewChangePayload, PrePreparePayload, NewViewPayload } from "../src/networkCommunication/Payload";
import { PBFTTerm, TermConfig } from "../src/PBFTTerm";
import { PreparedProof } from "../src/storage/PBFTStorage";
import { BlockUtilsMock, calculateBlockHash } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aPayload, aPrePreparePayload } from "./builders/PayloadBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { blockMatcher } from "./matchers/blockMatcher";
import { TestNetwork } from "./network/TestNetwork";
import { nextTick } from "./timeUtils";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    let testNetwork: TestNetwork;
    let node0BlockUtils: BlockUtilsMock;
    let node1BlockUtils: BlockUtilsMock;
    let node2BlockUtils: BlockUtilsMock;

    let triggerElection: () => void;
    let node0Config: Config;
    let node1Config: Config;
    let node2Config: Config;
    let node3Config: Config;
    let node0Pk: string;
    let node1Pk: string;
    let node2Pk: string;
    let node3Pk: string;
    let node0KeyManager: KeyManager;
    let node1KeyManager: KeyManager;
    let node2KeyManager: KeyManager;
    let node3KeyManager: KeyManager;

    beforeEach(() => {
        const testNetworkData = aSimpleTestNetwork(4);

        testNetwork = testNetworkData.testNetwork;
        triggerElection = testNetworkData.triggerElection;
        node0Config = testNetwork.nodes[0].config;
        node1Config = testNetwork.nodes[1].config;
        node2Config = testNetwork.nodes[2].config;
        node3Config = testNetwork.nodes[3].config;
        node0BlockUtils = node0Config.blockUtils as BlockUtilsMock;
        node1BlockUtils = node1Config.blockUtils as BlockUtilsMock;
        node2BlockUtils = node2Config.blockUtils as BlockUtilsMock;
        node0Pk = testNetwork.nodes[0].pk;
        node1Pk = testNetwork.nodes[1].pk;
        node2Pk = testNetwork.nodes[2].pk;
        node3Pk = testNetwork.nodes[3].pk;
        node0KeyManager = testNetwork.nodes[0].config.keyManager;
        node1KeyManager = testNetwork.nodes[1].config.keyManager;
        node2KeyManager = testNetwork.nodes[2].config.keyManager;
        node3KeyManager = testNetwork.nodes[3].config.keyManager;
    });

    afterEach(() => {
        testNetwork.shutDown();
    });

    function createPBFTTerm(config: Config): PBFTTerm {
        const pbftTermConfig: TermConfig = PBFT.buildTermConfig(config);
        const pbftTerm: PBFTTerm = new PBFTTerm(pbftTermConfig, 0, () => { });
        return pbftTerm;
    }

    it("onNewView should not accept views from the past", async () => {
        const pbftTerm: PBFTTerm = createPBFTTerm(node0Config);
        expect(pbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(pbftTerm.getView()).to.equal(1);

        pbftTerm.onReceiveNewView(aPayload(node0KeyManager, { term: 1, view: 0, PP: undefined }));
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onViewChange should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");
        // current view (1) => valid
        node1PbftTerm.onReceiveViewChange(aPayload(node0KeyManager, { term: 1, newView: 1 }));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aPayload(node0KeyManager, { term: 1, newView: 0 }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept more Prepares after 2f + 1", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const spy = sinon.spy(node1Config.pbftStorage, "storeCommit");
        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);

        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node0KeyManager, 1, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        node1PbftTerm.onReceivePrepare(aPayload(node2KeyManager, { term: 1, view: 0, blockHash }));
        node1PbftTerm.onReceivePrepare(aPayload(node3KeyManager, { term: 1, view: 0, blockHash }));
        expect(spy).to.have.been.calledOnce;
    });

    it("onReceivePrepare should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);

        // current view (1) => valid
        node1PbftTerm.onReceivePrepare(aPayload(node0KeyManager, { term: 1, view: 1, blockHash }));
        expect(spy).to.have.been.called;

        // view from the future (2) => valid
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0KeyManager, { term: 1, view: 2, blockHash }));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0KeyManager, { term: 1, view: 0, blockHash }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should accept views that match its current view", async () => {
        const pbftTermConfig: TermConfig = PBFT.buildTermConfig(node1Config);
        const node1PbftTerm: PBFTTerm = new PBFTTerm(pbftTermConfig, 0, () => { });
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");

        // current view (1) => valid
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node1KeyManager, 1, 1, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.have.been.called;

        // view from the future (2) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node1KeyManager, 1, 2, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node1KeyManager, 1, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept messages from the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        // not from the leader => ok
        node1PbftTerm.onReceivePrepare(aPayload(node2KeyManager, { term: 1, view: 0, blockHash: "" }));
        expect(spy).to.have.been.called;

        // from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPayload(node0KeyManager, { term: 1, view: 0, blockHash: "" }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages not from the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);

        const spy = sinon.spy(node1Config.blockUtils, "validateBlock");
        // from the leader => ok
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node0KeyManager, 1, 0, block));
        await nextTick();
        expect(spy).to.have.been.called;

        // not from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node2KeyManager, 1, 0, block));
        await nextTick();

        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages where the given block doesn't match the given blockHash", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const badBlockHash = calculateBlockHash(aBlock(block));

        const spy = sinon.spy(node1Config.blockUtils, "validateBlock");
        // blockHash match block's hash =>
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node0KeyManager, 1, 0, block));
        await nextTick();
        expect(spy).to.have.been.called;

        // blockHash does NOT match block's hash =>
        spy.resetHistory();
        const prepreparePayload: PrePreparePayload = aPrePreparePayload(node2KeyManager, 1, 2, block);
        prepreparePayload.data.blockHash = badBlockHash;
        node1PbftTerm.onReceivePrePrepare(prepreparePayload);
        await nextTick();
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages that don't match the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange3: ViewChangePayload = aPayload(node3Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProof: ViewChangePayload[] = [viewChange0, viewChange1, viewChange3];

        // from the leader => ok
        node1PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 2, PP: aPrePreparePayload(node2KeyManager, 1, 2, block), VCProof }));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);

        // not from the leader => ignore
        node1PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 3, PP: aPrePreparePayload(node2KeyManager, 1, 3, block), VCProof }));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);
    });

    it("onReceiveViewChange should not accept messages that don't match me as the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");

        // match me as a leader => ok
        node1PbftTerm.onReceiveViewChange(aPayload(node0KeyManager, { term: 1, newView: 1 }));
        expect(spy).to.have.been.called;

        // doesn't match me as a leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aPayload(node0KeyManager, { term: 1, newView: 2 }));
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages don't match the PP.view", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProof: ViewChangePayload[] = [viewChange0, viewChange1, viewChange2];

        // same view => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // miss matching view => ignore
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 2, block), VCProof }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages that don't pass validation", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProof: ViewChangePayload[] = [viewChange0, viewChange1, viewChange2];

        // pass validation => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // doesn't pass validation => ignore
        node0PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 2, PP: aPrePreparePayload(node2KeyManager, 1, 2, block), VCProof }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(false);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof with duplicate sender", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0_good: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_good: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_good: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofGood: ViewChangePayload[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // unique senders => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof: VCProofGood }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_bad: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_bad: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofBad: ViewChangePayload[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // Duplicted sender (viewChange0_bad and viewChange1_bad are from node 0) => ignore
        node0PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 2, PP: aPrePreparePayload(node2KeyManager, 1, 2, block), VCProof: VCProofBad }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof dont have matching term", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0_good: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_good: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_good: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofGood: ViewChangePayload[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching terms senders => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof: VCProofGood }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangePayload = aPayload(node0Config.keyManager, { term: 666, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_bad: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_bad: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofBad: ViewChangePayload[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // viewChange0 offered term 666
        node0PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 2, PP: aPrePreparePayload(node2KeyManager, 1, 2, block), VCProof: VCProofBad }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof dont have matching view", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0_good: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_good: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_good: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofGood: ViewChangePayload[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching view => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof: VCProofGood }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 666, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_bad: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_bad: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 2, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofBad: ViewChangePayload[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // viewChange0 offered view 666
        node0PbftTerm.onReceiveNewView(aPayload(node2KeyManager, { term: 1, view: 2, PP: aPrePreparePayload(node2KeyManager, 1, 2, block), VCProof: VCProofBad }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof that dont match the block in PP", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const viewChange0_good: ViewChangePayload = aPayload(node0Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange1_good: ViewChangePayload = aPayload(node1Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const viewChange2_good: ViewChangePayload = aPayload(node2Config.keyManager, { term: 1, newView: 1, preparedProof: { prepreparePayload: undefined, preparePayloads: undefined } });
        const VCProofGood: ViewChangePayload[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching view => ok
        node0PbftTerm.onReceiveNewView(aPayload(node1KeyManager, { term: 1, view: 1, PP: aPrePreparePayload(node1KeyManager, 1, 1, block), VCProof: VCProofGood }));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("dipose should clear all the storage related to its term", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.undefined;

        // add preprepare to the storage
        node1PbftTerm.onReceivePrePrepare(aPrePreparePayload(node0KeyManager, 0, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.equal(block);

        node1PbftTerm.dispose();

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.undefined;

    });

    it("should send the prepared proof in the view-change", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);
        const blockHash = calculateBlockHash(block);
        const spy = sinon.spy(node1Config.networkCommunication, "sendToMembers");

        // get node1 to be prepared on the block
        node1Config.pbftStorage.storePrePrepare(0, 0, block, aPrePreparePayload(node0KeyManager, 0, 0, block));
        node1Config.pbftStorage.storePrepare(0, 0, blockHash, node2KeyManager.getMyPublicKey(), aPayload(node2KeyManager, { term: 0, view: 0, blockHash }));
        node1Config.pbftStorage.storePrepare(0, 0, blockHash, node3KeyManager.getMyPublicKey(), aPayload(node3KeyManager, { term: 0, view: 0, blockHash }));
        node1PbftTerm.onReceiveViewChange(aPayload(node0KeyManager, { term: 0, newView: 1 }));
        node1PbftTerm.onReceiveViewChange(aPayload(node2KeyManager, { term: 0, newView: 1 }));
        node1PbftTerm.onReceiveViewChange(aPayload(node3KeyManager, { term: 0, newView: 1 }));
        triggerElection();
        nextTick();

        const latestPreparedProof = node1Config.pbftStorage.getLatestPreparedProof(0, 1);

        expect(spy.args[0][2].data.preparedProof).to.deep.equal(latestPreparedProof);
    });

    it("should ignore view-change with an invalid prepared proof", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");

        const block: Block = aBlock(theGenesisBlock);
        const prepreparePayload: PrePreparePayload = aPrePreparePayload(node0Config.keyManager, 0, 1, block);
        const preparedProof: PreparedProof = { prepreparePayload, preparePayloads: undefined };
        const payload: ViewChangePayload = aPayload(node0Config.keyManager, { term: 0, newView: 1, preparedProof });
        node1PbftTerm.onReceiveViewChange(payload);

        expect(spy).to.not.have.been.called;
    });

    describe("view-change proofs", () => {
        async function testProof(VCProof: ViewChangePayload[]) {
            const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
            const block: Block = aBlock(theGenesisBlock);
            const blockHash = calculateBlockHash(block);
            const prePreparePayload: PrePreparePayload = aPrePreparePayload(node2KeyManager, 1, 2, block);
            const newViewPayload: NewViewPayload = aPayload(node2KeyManager, { term: 1, view: 2, PP: prePreparePayload, VCProof });

            expect(node1PbftTerm.getView()).to.equal(0);

            node1PbftTerm.onReceiveNewView(newViewPayload);
            await nextTick();
            await node1BlockUtils.resolveAllValidations(true);

            expect(node1PbftTerm.getView()).to.equal(0);
        }

        it("onNewView should not accept new view without view-change proofs", async () => {
            await testProof(undefined);
        });

        it("onNewView should not accept new view with invalid view-change", async () => {
            const badValue: any = 666;
            await testProof(badValue);
        });

        it("onNewView should not accept new view without 2f+1 view-change proofs", async () => {
            await testProof([]);
        });
    });
});