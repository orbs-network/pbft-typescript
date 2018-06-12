export interface ElectionTrigger {
    register(cb: () => void): number;
    unregister(token: number): void;
    dispose(): void;
}

export type ElectionTriggerFactory = (view: number) => ElectionTrigger;
