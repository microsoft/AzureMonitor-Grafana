import { PluginContextType } from "@grafana/data";
import { reportInteraction } from "@grafana/runtime";

export class Reporter {
    private pluginContext: PluginContextType | null;
    constructor(pluginContext: PluginContextType | null) {
        this.pluginContext = pluginContext;
    }

    public reportException(exceptionName: string, properties: Record<string, unknown>) {
        const newProperties = {...this.pluginContext?.meta, ...properties};
        reportInteraction(exceptionName, newProperties);
    }

    public reportPageView(pageName: string, properties: Record<string, unknown>) {
        const newProperties = {...this.pluginContext?.meta, ...properties};
        reportInteraction(pageName, newProperties);
    }
    
    public reportEvent(eventName: string, properties: Record<string, unknown>) {
        const newProperties = {...this.pluginContext?.meta, ...properties};
        reportInteraction(eventName, newProperties);
    }
}
