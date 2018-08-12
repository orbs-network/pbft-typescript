export interface ElectionTrigger {
    start(cb: () => void): void;
    stop(): void;
}

export type ElectionTriggerFactory = (view: number) => ElectionTrigger;
