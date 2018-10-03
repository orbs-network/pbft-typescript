export interface Block {
    getHeight(): number;
    getBlockHash(): Buffer;
}