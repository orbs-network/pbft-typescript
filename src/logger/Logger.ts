export interface Logger {
    log(msg: string): void;
}

class ConsoleLogger implements Logger {
    public log(msg: string): void {
        console.log(msg);
    }
}

class DummyLogger implements Logger {
    public log(msg: string): void {}
}

export const logger = process.env.NODE_ENV === "test" ? new DummyLogger() : new ConsoleLogger();