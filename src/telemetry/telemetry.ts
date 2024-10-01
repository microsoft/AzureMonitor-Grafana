export class TelemetryClient {
    private readonly report: (name: string, properties: Record<string, unknown>) => void;

    constructor(report: (name: string, properties: Record<string, unknown>) => void) {
        this.report = report;
    }

    public reportException(exceptionName: string, properties: Record<string, unknown>) {
        console.log("reporting exception");
        this.report(exceptionName, properties);
    }

    public reportPageView(pageName: string, properties: Record<string, unknown>) {
        console.log("reporting page view");
        this.report(pageName, properties);
    }
    
    public reportEvent(eventName: string, properties: Record<string, unknown>) {
        console.log("reporting event");
        this.report(eventName, properties);
    }
}
