import { DataSourceJsonData } from "@grafana/data";
import { DataSourceWithBackend } from "@grafana/runtime";
import { DataQuery } from "@grafana/schema";

export default class BackendDatasource extends DataSourceWithBackend<DataQuery, DataSourceJsonData>{

    getAzureMonitorWorkspace(cluster: string): Promise<string | undefined> {
        if (cluster) {
            return this.getResource(`/azureMonitor/workspaces/${cluster}`);
        }
        return Promise.resolve(undefined);
    }
}
