import { Block } from "../Block";

/// STORAGE ///
type StorePrePrepare = {
    StorageType: "PrePrepare",
    term: number,
    view: number,
    block: Block
};

type StorePrepare = {
    StorageType: "Prepare",
    term: number,
    view: number,
    blockHash: string,
    senderPk: string
};

type StoreCommit = {
    StorageType: "Commit",
    term: number,
    view: number,
    blockHash: string,
    senderPk: string
};

type StoreViewChange = {
    StorageType: "ViewChange",
    term: number,
    view: number,
    senderPk: string
};

type StorageLogData = { Subject: "Storage" } & (StorePrePrepare | StorePrepare | StoreCommit | StoreViewChange);

/// GOSSIP ///
type GossipSendLogData = { Subject: "GossipSend", message: string, targetId: string, payload: any };
type GossipReceiveLogData = { Subject: "GossipReceive", senderPk: string, payload: any };

// FLOW
type FlowElected = {
    FlowType: "Elected",
    term: number,
    view: number,
    blockHash: string
};

type FlowCommit = {
    FlowType: "Commit",
    term: number,
    view: number,
    block: Block
};

type FlowLeaderChange = {
    FlowType: "LeaderChange",
    term: number,
    newView: number,
    leaderPk: string
};

type FlowLogData = { Subject: "Flow" } & (FlowElected | FlowCommit | FlowLeaderChange);

// WARNING
type WarningLogData = { Subject: "Warning", message: string, metaData?: any };

// WARNING
type InfoLogData = { Subject: "Info", message: string, metaData?: any };

export type LogTypes = StorageLogData | GossipSendLogData | GossipReceiveLogData | FlowLogData | WarningLogData | InfoLogData;

export interface Logger {
    log(data: LogTypes): void;
}
