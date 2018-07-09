export interface Block {
    header: {
        hash: string;
        prevBlockHash: string;
    };
}