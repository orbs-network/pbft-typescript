import { Block } from "../Block";

/// STORAGE ///
type StorePrePrepare = {
    StorageType: "PrePrepare",
    blockHeight: number,
    view: number,
    blockHash: string,
    senderPk: string
};

type StorePrepare = {
    StorageType: "Prepare",
    blockHeight: number,
    view: number,
    blockHash: string,
    senderPk: string
};

type StoreCommit = {
    StorageType: "Commit",
    blockHeight: number,
    view: number,
    blockHash: string,
    senderPk: string
};

type StoreViewChange = {
    StorageType: "ViewChange",
    blockHeight: number,
    view: number,
    senderPk: string
};

type ClearHeight = {
    StorageType: "ClearHeight",
    blockHeight: number
};

type StorageLogData = { subject: "Storage" } & (StorePrePrepare | StorePrepare | StoreCommit | StoreViewChange | ClearHeight);

/// GOSSIP ///
type GossipSendLogData = {
    subject: "GossipSend",
    message: string,
    targetPks: string[],
    senderPk: string,
    blockHeight: number,
    view: number,
    blockHash?: string
};


// FLOW
type FlowElected = {
    FlowType: "Elected",
    blockHeight: number,
    view: number
};

type FlowCommit = {
    FlowType: "Commit",
    blockHeight: number,
    view: number,
    blockHash: string
};

type FlowLeaderChange = {
    FlowType: "LeaderChange",
    blockHeight: number,
    newView: number,
    leaderPk: string
};

type FlowLogData = { subject: "Flow" } & (FlowElected | FlowCommit | FlowLeaderChange);

// WARNING
type WarningLogData = { subject: "Warning", message: string, metaData?: object };

// WARNING
type InfoLogData = { subject: "Info", message: string, metaData?: object };

export type LogTypes = StorageLogData | GossipSendLogData | FlowLogData | WarningLogData | InfoLogData;

export interface Logger {
    log(data: LogTypes): void;
}
