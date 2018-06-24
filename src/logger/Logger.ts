/// STORAGE ///
type StorePrePrepare = {
    StorageType: "PrePrepare",
    term: number,
    view: number,
    blockHash: string
};

type StorePrepare = {
    StorageType: "Prepare",
    term: number,
    view: number,
    blockHash: string,
    senderId: string
};

type StoreCommit = {
    StorageType: "Commit",
    term: number,
    view: number,
    blockHash: string,
    senderId: string
};

type StoreViewChange = {
    StorageType: "ViewChange",
    term: number,
    view: number,
    senderId: string
};

type StorageLogData = { Subject: "Storage" } & (StorePrePrepare | StorePrepare | StoreCommit | StoreViewChange);

/// GOSSIP ///
type GossipSendLogData = { Subject: "GossipSend", message: string, senderId: string, targetId: string, payload: any };
type GossipReceiveLogData = { Subject: "GossipReceive", senderId: string, payload: any };

// FLOW
type FlowElected = {
    FlowType: "Elected",
    term: number,
    view: number,
    blockHash: string,
};

type FlowCommit = {
    FlowType: "Commit"
};

type FlowLeaderChange = {
    FlowType: "LeaderChange",
    term: number,
    newView: number,
    leaderId: string
};

type FlowLogData = { Subject: "Flow" } & (FlowElected | FlowCommit | FlowLeaderChange);

// WARNING
type WarningLogData = { Subject: "Warning", message: string };

export type LogTypes = StorageLogData | GossipSendLogData | GossipReceiveLogData | FlowLogData | WarningLogData;

export interface Logger {
    log(data: LogTypes): void;
}
export interface LoggerConstructor {
    new (id: string): Logger;
}