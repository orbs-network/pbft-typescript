export interface ElectionTrigger {
    start(): void;
    stop(): void;
    register(cb: () => void): void;
    snooze(): void;
}