
export function reportException(exceptionName: string, properties: Record<string, unknown>, report: (name: string, properties: Record<string, unknown>) => void) {
    console.log("reporting exception");
    report(exceptionName, properties);
}
