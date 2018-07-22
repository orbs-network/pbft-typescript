export interface Block {
    header: {
        height: number;
        prevBlockHash: Buffer;
    };
    body: any;
}