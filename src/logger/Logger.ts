export interface Logger {
    log(msg: string): void;
    logC(msg: string): void;
    cycle(): void;
}
