export interface Block {
    header: {
        height: number;
        blockHash: Buffer;
    };
}