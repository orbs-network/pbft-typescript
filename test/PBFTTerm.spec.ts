/// <reference path="./matchers/blockMatcher.d.ts"/>

import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import { KeyManager, PBFT } from "../src";
import { Block } from "../src/Block";
import { Config } from "../src/Config";
import { NewViewMessage, PrePrepareMessage, ViewChangeMessage, PreparedProof, ViewChangeConfirmation, BlockRefMessage } from "../src/networkCommunication/Messages";
import { PBFTTerm, TermConfig } from "../src/PBFTTerm";
import { PreparedMessages } from "../src/storage/PBFTStorage";
import { BlockUtilsMock, calculateBlockHash } from "./blockUtils/BlockUtilsMock";
import { aBlock, theGenesisBlock } from "./builders/BlockBuilder";
import { aCommitMessage, aNewViewMessage, aPrepareMessage, aPrePrepareMessage, aViewChangeMessage, blockRefMessageFromPP } from "./builders/MessagesBuilder";
import { aPrepared } from "./builders/ProofBuilder";
import { aSimpleTestNetwork } from "./builders/TestNetworkBuilder";
import { blockMatcher } from "./matchers/blockMatcher";
import { Node } from "./network/Node";
import { TestNetwork } from "./network/TestNetwork";
import { nextTick } from "./timeUtils";
chai.use(sinonChai);
chai.use(blockMatcher);

describe("PBFTTerm", () => {
    let testNetwork: TestNetwork;
    let node0: Node;
    let node1: Node;
    let node2: Node;
    let node3: Node;

    let node0BlockUtils: BlockUtilsMock;
    let node1BlockUtils: BlockUtilsMock;

    let triggerElection: () => void;
    let node0Config: Config;
    let node1Config: Config;
    let node2Config: Config;
    let node3Config: Config;

    let node0KeyManager: KeyManager;
    let node1KeyManager: KeyManager;
    let node2KeyManager: KeyManager;
    let node3KeyManager: KeyManager;

    beforeEach(() => {
        const testNetworkData = aSimpleTestNetwork(4);

        testNetwork = testNetworkData.testNetwork;
        triggerElection = () => {
            node0.triggerElection();
            node1.triggerElection();
            node2.triggerElection();
            node3.triggerElection();
        };
        node0 = testNetwork.nodes[0];
        node1 = testNetwork.nodes[1];
        node2 = testNetwork.nodes[2];
        node3 = testNetwork.nodes[3];
        node0Config = node0.config;
        node1Config = node1.config;
        node2Config = node2.config;
        node3Config = node3.config;
        node0BlockUtils = node0Config.blockUtils as BlockUtilsMock;
        node1BlockUtils = node1Config.blockUtils as BlockUtilsMock;
        node0KeyManager = node0.config.keyManager;
        node1KeyManager = node1.config.keyManager;
        node2KeyManager = node2.config.keyManager;
        node3KeyManager = node3.config.keyManager;
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

        pbftTerm.onReceiveNewView(aNewViewMessage(node0KeyManager, 1, 0, undefined, undefined));
        expect(pbftTerm.getView()).to.equal(1);
    });

    it("onViewChange should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");
        // current view (1) => valid
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node0KeyManager, 1, 1));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node0KeyManager, 1, 0));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept more Prepares after 2f + 1", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const spy = sinon.spy(node1Config.pbftStorage, "storeCommit");
        const block: Block = aBlock(theGenesisBlock);

        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node0KeyManager, 1, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node2KeyManager, 1, 0, block));
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node3KeyManager, 1, 0, block));
        expect(spy).to.have.been.calledOnce;
    });

    describe("signature verifications", () => {
        let node1PbftTerm: PBFTTerm;
        const block: Block = aBlock(theGenesisBlock);
        beforeEach(() => {
            node1PbftTerm = createPBFTTerm(node1Config);
            expect(node1PbftTerm.getView()).to.equal(0);
            triggerElection();
            expect(node1PbftTerm.getView()).to.equal(1);
        });

        it("onReceivePrePrepare should not accept messages that don't pass signature verification", async () => {
            const spy = sinon.spy(node1Config.blockUtils, "validateBlock");
            const PPMessage = aPrePrepareMessage(node0KeyManager, 1, 0, block);

            // Message is valid => valid
            node1PbftTerm.onReceivePrePrepare(PPMessage);
            await nextTick();
            expect(spy).to.have.been.called;

            // Destorying the signature => invalid, should be ignored
            PPMessage.sender.signature = "FAKE_SIGNATURE";
            spy.resetHistory();
            node1PbftTerm.onReceivePrePrepare(PPMessage);
            await nextTick();

            expect(spy).to.not.have.been.called;
        });

        it("onReceivePrepare should not accept messages that don't pass signature verification", async () => {
            const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
            const PMessage = aPrepareMessage(node0KeyManager, 1, 1, block);

            // Message is valid => valid
            node1PbftTerm.onReceivePrepare(PMessage);
            expect(spy).to.have.been.called;

            // Destorying the signature => invalid, should be ignored
            PMessage.sender.signature = "FAKE_SIGNATURE";
            spy.resetHistory();
            node1PbftTerm.onReceivePrepare(PMessage);
            expect(spy).to.not.have.been.called;
        });

        it("onReceiveCommit should not accept messages that don't pass signature verification", async () => {
            const spy = sinon.spy(node1Config.pbftStorage, "storeCommit");
            const CMessage = aCommitMessage(node0KeyManager, 1, 1, block);

            // Message is valid => valid
            node1PbftTerm.onReceiveCommit(CMessage);
            expect(spy).to.have.been.called;

            // Destorying the signature => invalid, should be ignored
            CMessage.sender.signature = "FAKE_SIGNATURE";
            spy.resetHistory();
            node1PbftTerm.onReceiveCommit(CMessage);
            expect(spy).to.not.have.been.called;
        });

        it("onReceiveNewView hould not accept messages that don't pass signature verification", async () => {
            const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

            const block: Block = aBlock(theGenesisBlock);
            const viewChange0: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
            const viewChange1: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
            const viewChange2: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
            const VCProof: ViewChangeMessage[] = [viewChange0, viewChange1, viewChange2];

            const NVMessage: NewViewMessage = aNewViewMessage(node1KeyManager, 1, 2, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProof);

            // destorying the signature => invalid, should be ignored
            NVMessage.sender.signature = "FAKE_SIGNATURE";
            node0PbftTerm.onReceiveNewView(NVMessage);
            await nextTick();
            await node0BlockUtils.resolveAllValidations(true);
            expect(node0PbftTerm.getView()).to.equal(0);
        });

        it("onViewChange should not accept messages that don't pass signature verification", async () => {
            const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");
            const VCMessage: ViewChangeMessage = aViewChangeMessage(node0KeyManager, 1, 1);

            // Message is valid => valid
            node1PbftTerm.onReceiveViewChange(VCMessage);
            expect(spy).to.have.been.called;

            spy.resetHistory();
            // destorying the signature => invalid, should be ignored
            VCMessage.sender.signature = "FAKE_SIGNATURE";
            node1PbftTerm.onReceiveViewChange(VCMessage);
            expect(spy).to.not.have.been.called;
        });

    });

    it("onReceivePrepare should not accept views from the past", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        const block: Block = aBlock(theGenesisBlock);

        // current view (1) => valid
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node0KeyManager, 1, 1, block));
        expect(spy).to.have.been.called;

        // view from the future (2) => valid
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node0KeyManager, 1, 2, block));
        expect(spy).to.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node0KeyManager, 1, 0, block));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should accept views that match its current view", async () => {
        const pbftTermConfig: TermConfig = PBFT.buildTermConfig(node1Config);
        const node1PbftTerm: PBFTTerm = new PBFTTerm(pbftTermConfig, 0, () => { });
        expect(node1PbftTerm.getView()).to.equal(0);
        triggerElection();
        expect(node1PbftTerm.getView()).to.equal(1);

        const block: Block = aBlock(theGenesisBlock);
        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");

        // current view (1) => valid
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node1KeyManager, 1, 1, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.have.been.called;

        // view from the future (2) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node1KeyManager, 1, 2, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;

        // view from the past (0) => invalid, should be ignored
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node1KeyManager, 1, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrepare should not accept messages from the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);

        const spy = sinon.spy(node1Config.pbftStorage, "storePrepare");
        // not from the leader => ok
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node2KeyManager, 1, 0, block));
        expect(spy).to.have.been.called;

        // from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrepare(aPrepareMessage(node0KeyManager, 1, 0, block));
        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages not from the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);

        const spy = sinon.spy(node1Config.blockUtils, "validateBlock");
        // from the leader => ok
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node0KeyManager, 1, 0, block));
        await nextTick();
        expect(spy).to.have.been.called;

        // not from the leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node2KeyManager, 1, 0, block));
        await nextTick();

        expect(spy).to.not.have.been.called;
    });

    it("onReceivePrePrepare should not accept messages where the given block doesn't match the given blockHash", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);
        const badBlockHash = calculateBlockHash(aBlock(block));

        const spy = sinon.spy(node1Config.blockUtils, "validateBlock");
        // blockHash match block's hash =>
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node0KeyManager, 1, 0, block));
        await nextTick();
        expect(spy).to.have.been.called;

        // blockHash does NOT match block's hash =>
        spy.resetHistory();
        const preprepareMessage: PrePrepareMessage = aPrePrepareMessage(node2KeyManager, 1, 2, block);
        preprepareMessage.signedHeader.blockHash = badBlockHash;
        node1PbftTerm.onReceivePrePrepare(preprepareMessage);
        await nextTick();
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages that don't match the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 2);
        const viewChange1: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 2);
        const viewChange3: ViewChangeMessage = aViewChangeMessage(node3Config.keyManager, 1, 2);
        const VCProof: ViewChangeMessage[] = [viewChange0, viewChange1, viewChange3];

        // from the leader => ok
        node1PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 2, aPrePrepareMessage(node2KeyManager, 1, 2, block), VCProof));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);

        // not from the leader => ignore
        node1PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 3, aPrePrepareMessage(node2KeyManager, 1, 3, block), VCProof));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);
        expect(node1PbftTerm.getView()).to.equal(2);
    });

    it("onReceiveViewChange should not accept messages that don't match me as the leader", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");

        // match me as a leader => ok
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node0KeyManager, 1, 1));
        expect(spy).to.have.been.called;

        // doesn't match me as a leader => ignore
        spy.resetHistory();
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node0KeyManager, 1, 2));
        expect(spy).to.not.have.been.called;
    });

    it("onReceiveNewView should not accept messages don't match the PP.view", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProof: ViewChangeMessage[] = [viewChange0, viewChange1, viewChange2];

        // same view => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProof));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // miss matching view => ignore
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 2, block), VCProof));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages that don't match the PP.blockHeight", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block1: Block = aBlock(theGenesisBlock);
        const votes1: ViewChangeConfirmation[] = [
            aViewChangeMessage(node0Config.keyManager, 1, 1),
            aViewChangeMessage(node1Config.keyManager, 1, 1),
            aViewChangeMessage(node2Config.keyManager, 1, 1)
        ].map(vc => ({ signedHeader: vc.signedHeader, sender: vc.sender }));
        const PPMessage1: PrePrepareMessage = aPrePrepareMessage(node1KeyManager, 1, 1, block1);
        const nvMessage1: NewViewMessage = aNewViewMessage(node1KeyManager, 1, 1, PPMessage1, votes1);

        // same view => ok
        node0PbftTerm.onReceiveNewView(nvMessage1);
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const block2: Block = aBlock(block1);
        const votes2: ViewChangeConfirmation[] = [
            aViewChangeMessage(node0Config.keyManager, 1, 2),
            aViewChangeMessage(node1Config.keyManager, 1, 2),
            aViewChangeMessage(node2Config.keyManager, 1, 2)
        ].map(vc => ({ signedHeader: vc.signedHeader, sender: vc.sender }));
        const PPMessage2: PrePrepareMessage = aPrePrepareMessage(node2KeyManager, 666, 2, block2);
        const nvMessage2: NewViewMessage = aNewViewMessage(node2KeyManager, 1, 2, PPMessage2, votes2);

        // miss matching blockHeight => ignore
        node0PbftTerm.onReceiveNewView(nvMessage2);
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages that don't pass validation", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProof: ViewChangeMessage[] = [viewChange0, viewChange1, viewChange2];

        // pass validation => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProof));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        // doesn't pass validation => ignore
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 2, aPrePrepareMessage(node2KeyManager, 1, 2, block), VCProof));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(false);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof with duplicate sender", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0_good: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1_good: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2_good: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProofGood: ViewChangeMessage[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // unique senders => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProofGood));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 2);
        const viewChange1_bad: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 2);
        const viewChange2_bad: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 2);
        const VCProofBad: ViewChangeMessage[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // Duplicted sender (viewChange0_bad and viewChange1_bad are from node 0) => ignore
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 2, aPrePrepareMessage(node2KeyManager, 1, 2, block), VCProofBad));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof dont have matching blockHeight", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0_good: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1_good: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2_good: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProofGood: ViewChangeMessage[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching blockHeight senders => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProofGood));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 666, 2);
        const viewChange1_bad: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 2);
        const viewChange2_bad: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 2);
        const VCProofBad: ViewChangeMessage[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // viewChange0 offered blockHeight 666
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 2, aPrePrepareMessage(node2KeyManager, 1, 2, block), VCProofBad));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof dont have matching view", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0_good: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1_good: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2_good: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProofGood: ViewChangeMessage[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching view => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProofGood));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);

        const viewChange0_bad: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 666);
        const viewChange1_bad: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 2);
        const viewChange2_bad: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 2);
        const VCProofBad: ViewChangeMessage[] = [viewChange0_bad, viewChange1_bad, viewChange2_bad];

        // viewChange0 offered view 666
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node2KeyManager, 1, 2, aPrePrepareMessage(node2KeyManager, 1, 2, block), VCProofBad));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("onReceiveNewView should not accept messages with VCProof that dont match the block in PP", async () => {
        const node0PbftTerm: PBFTTerm = createPBFTTerm(node0Config);

        const block: Block = aBlock(theGenesisBlock);
        const viewChange0_good: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 1, 1);
        const viewChange1_good: ViewChangeMessage = aViewChangeMessage(node1Config.keyManager, 1, 1);
        const viewChange2_good: ViewChangeMessage = aViewChangeMessage(node2Config.keyManager, 1, 1);
        const VCProofGood: ViewChangeMessage[] = [viewChange0_good, viewChange1_good, viewChange2_good];

        // matching view => ok
        node0PbftTerm.onReceiveNewView(aNewViewMessage(node1KeyManager, 1, 1, aPrePrepareMessage(node1KeyManager, 1, 1, block), VCProofGood));
        await nextTick();
        await node0BlockUtils.resolveAllValidations(true);
        expect(node0PbftTerm.getView()).to.equal(1);
    });

    it("dipose should clear all the storage related to its blockHeight", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);

        const block: Block = aBlock(theGenesisBlock);

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.undefined;

        // add preprepare to the storage
        node1PbftTerm.onReceivePrePrepare(aPrePrepareMessage(node0KeyManager, 0, 0, block));
        await nextTick();
        await node1BlockUtils.resolveAllValidations(true);

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.equal(block);

        node1PbftTerm.dispose();

        expect(node1Config.pbftStorage.getPrePrepareBlock(0, 0)).to.be.undefined;

    });

    it("should send the prepared proof in the view-change", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const block: Block = aBlock(theGenesisBlock);
        const spy = sinon.spy(node1Config.networkCommunication, "sendViewChange");

        // get node1 to be prepared on the block
        node1Config.pbftStorage.storePrePrepare(aPrePrepareMessage(node0KeyManager, 0, 0, block));
        node1Config.pbftStorage.storePrepare(aPrepareMessage(node2KeyManager, 0, 0, block));
        node1Config.pbftStorage.storePrepare(aPrepareMessage(node3KeyManager, 0, 0, block));
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node0KeyManager, 0, 1));
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node2KeyManager, 0, 1));
        node1PbftTerm.onReceiveViewChange(aViewChangeMessage(node3KeyManager, 0, 1));
        triggerElection();
        nextTick();

        const prepared: PreparedMessages = node1Config.pbftStorage.getLatestPrepared(0, 1);
        const preprepareBlockRefMessage: BlockRefMessage = blockRefMessageFromPP(prepared.preprepareMessage);
        const latestPreparedProof: PreparedProof = {
            preprepareBlockRefMessage,
            prepareBlockRefMessages: prepared.prepareMessages
        };

        expect(spy.args[0][1].signedHeader.preparedProof).to.deep.equal(latestPreparedProof);
    });

    it("should ignore view-change with an invalid prepared proof", async () => {
        const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
        const spy = sinon.spy(node1Config.pbftStorage, "storeViewChange");

        const block: Block = aBlock(theGenesisBlock);
        const preprepareMessage: PrePrepareMessage = aPrePrepareMessage(node0Config.keyManager, 0, 1, block);
        const prepared: PreparedMessages = {
            preprepareMessage,
            prepareMessages: undefined
        };
        const message: ViewChangeMessage = aViewChangeMessage(node0Config.keyManager, 0, 1, prepared);
        node1PbftTerm.onReceiveViewChange(message);

        expect(spy).to.not.have.been.called;
    });

    describe("view-change proofs", () => {
        async function testProof(VCProof: ViewChangeMessage[], shouldPass: Boolean) {
            const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
            const block: Block = aBlock(theGenesisBlock);
            const prePrepareMessage: PrePrepareMessage = aPrePrepareMessage(node2KeyManager, 1, 2, block);
            const newViewMessage: NewViewMessage = aNewViewMessage(node2KeyManager, 1, 2, prePrepareMessage, VCProof);

            expect(node1PbftTerm.getView()).to.equal(0);

            node1PbftTerm.onReceiveNewView(newViewMessage);
            await nextTick();
            await node1BlockUtils.resolveAllValidations(true);

            expect(node1PbftTerm.getView()).to.equal(shouldPass ? 1 : 0);
        }

        it("onNewView should not accept new view without view-change proofs", async () => {
            await testProof(undefined, false);
        });

        it("onNewView should not accept new view with invalid view-change", async () => {
            const badValue: any = 666;
            await testProof(badValue, false);
        });

        it("onNewView should not accept new view without 2f+1 view-change proofs", async () => {
            await testProof([], false);
        });

        it("onNewView should offer (On PP) the heighest block from the VCProof", async () => {
            const block: Block = aBlock(theGenesisBlock);
            const blockHeight = 0;
            const targetView = 5;

            // VC with prepared proof on view 3
            const blockOnView3 = aBlock(block, "Block on View 3");
            const preparedProofOnView3: PreparedMessages = aPrepared(node3, [node1, node2], blockHeight, 3, blockOnView3);
            const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, blockHeight, targetView, preparedProofOnView3);

            // VC with prepared proof on view 4
            const blockOnView4 = aBlock(block, "Block on View 4");
            const preparedProofOnView4: PreparedMessages = aPrepared(node0, [node1, node2], blockHeight, 4, blockOnView4);
            const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, blockHeight, targetView, preparedProofOnView4);

            // VC with no prepared proof
            const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.config.keyManager, blockHeight, targetView);

            const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.config.keyManager, blockHeight, targetView, blockOnView4);
            const VCProof: ViewChangeMessage[] = [node0VCMessage, node2VCMessage, node3VCMessage];
            const message: NewViewMessage = aNewViewMessage(node1.config.keyManager, blockHeight, targetView, PPMessage, VCProof);


            const storePrePrepareSpy = sinon.spy(node1.config.pbftStorage, "storePrePrepare");
            const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
            expect(node1PbftTerm.getView()).to.equal(0);

            node1PbftTerm.onReceiveNewView(message);
            await nextTick();
            await node1BlockUtils.resolveAllValidations(true);

            expect(storePrePrepareSpy.args[0][0].block.header.blockHash).to.equal(blockOnView4.header.blockHash);
        });

        it("onNewView should reject a new-view if the offered (On PP) block is not the heighest block on the VCProof", async () => {
            const block: Block = aBlock(theGenesisBlock);
            const blockHeight = 1;
            const targetView = 5;

            // VC with prepared proof on view 3
            const blockOnView3 = aBlock(block, "Block on View 3");
            const preparedOnView3: PreparedMessages = aPrepared(node0, [node1, node2], 1, 3, blockOnView3);
            const node0VCMessage: ViewChangeMessage = aViewChangeMessage(node0.config.keyManager, blockHeight, targetView, preparedOnView3);

            // VC with prepared proof on view 4
            const blockOnView4 = aBlock(block, "Block on View 4");
            const preparedOnView4: PreparedMessages = aPrepared(node0, [node1, node2], 1, 4, blockOnView4);
            const node2VCMessage: ViewChangeMessage = aViewChangeMessage(node2.config.keyManager, blockHeight, targetView, preparedOnView4);

            // VC with no prepared proof
            const node3VCMessage: ViewChangeMessage = aViewChangeMessage(node3.config.keyManager, blockHeight, targetView);

            const PPMessage: PrePrepareMessage = aPrePrepareMessage(node1.config.keyManager, blockHeight, targetView, blockOnView3);
            const VCProof: ViewChangeMessage[] = [node0VCMessage, node2VCMessage, node3VCMessage];
            const votes: ViewChangeConfirmation[] = VCProof.map(msg => ({ signedHeader: msg.signedHeader, sender: msg.sender }));
            const message: NewViewMessage = aNewViewMessage(node1.config.keyManager, blockHeight, targetView, PPMessage, votes);

            const node1PbftTerm: PBFTTerm = createPBFTTerm(node1Config);
            expect(node1PbftTerm.getView()).to.equal(0);

            node1PbftTerm.onReceiveNewView(message);
            await nextTick();
            await node1BlockUtils.resolveAllValidations(true);

            expect(node1PbftTerm.getView()).to.equal(0);
        });
    });
});