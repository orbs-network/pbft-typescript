export interface ElectionTrigger {
    registerOnTrigger(view: number, cb: (view: number) => void): void;
    unregisterOnTrigger(): void;
}
