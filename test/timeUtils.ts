export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function every(ms: number, times: number, todo: Function) {
    return new Promise(resolve => {
        let counter = times;
        const intervalTimer = setInterval(() => {
            todo();
            counter--;
            if (counter === 0) {
                clearInterval(intervalTimer);
                resolve();
            }
        }, ms);
    });
}