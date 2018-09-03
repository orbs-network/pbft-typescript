export interface ElectionTrigger {
    setView(view: number): void;
    registerOnTrigger(cb: (view: number) => void): void;
    unregisterOnTrigger(): void;
}
