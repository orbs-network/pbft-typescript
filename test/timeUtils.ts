export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function every(ms: number, delay: number, todo: Function) {
    let isActive = true;
    let intervalTimer: number;

    wait(delay).then(() => {
        if (isActive) {
            intervalTimer = setInterval(todo, 100);
        }
    });

    return function stop() {
        isActive = false;
        if (intervalTimer) {
            clearInterval(intervalTimer);
        }
    };
}