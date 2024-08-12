import { DataSourceInstanceSettings } from "@grafana/data";
import { SceneObjectState } from "@grafana/scenes";
import { DataSourceRef } from "@grafana/schema";


export interface ConfigurationState extends SceneObjectState {
    datasources: DataSourceInstanceSettings[];
    clusters: string[];
    defaultDatasource?: DataSourceRef;
    defaultCluster: string;
    workspaceName?: string;
    amwToClusterId?: Record<string, string>;
}

export interface VariableSelectionState extends SceneObjectState {
    selectedCluster: string;
    selectedPromDatasource: DataSourceRef;
}
