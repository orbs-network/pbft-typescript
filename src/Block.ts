export interface Block {
    header: {
        height: number;
        prevBlockHash: string;
    };
    body: any;
}