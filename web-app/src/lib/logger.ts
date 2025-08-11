export function createLogger(name: string) {
    return {
        info: (message: any, ...args: any[]) => {
            console.log(`[${name}] INFO:`, message, ...args);
        },
        warn: (message: any, ...args: any[]) => {
            console.warn(`[${name}] WARN:`, message, ...args);
        },
        error: (message: any, ...args: any[]) => {
            console.error(`[${name}] ERROR:`, message, ...args);
        },
        debug: (message: any, ...args: any[]) => {
            console.debug(`[${name}] DEBUG:`, message, ...args);
        }
    };
}
