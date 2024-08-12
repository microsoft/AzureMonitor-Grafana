import { SceneObjectBase, sceneGraph } from "@grafana/scenes";
import { ConfigurationState } from "./types";
import { AKSConfigurationRenderer } from "../components/AKSConfigurationRenderer";
import {  LoadingState } from "@grafana/data";
import { getDataSourceSrv } from "@grafana/runtime";
import { DataSourceRef } from "@grafana/schema";

export class AKSConfiguration extends SceneObjectBase<ConfigurationState> {
    static Component = AKSConfigurationRenderer;
    static setConfigState: (configState: Partial<ConfigurationState>) => void;

    public onClusterChange = (newDefaultCluster: string) => {
        this.setState({ defaultCluster: newDefaultCluster });

        // check if there are any AMWs that map to this cluster
        let foundAMW = false;
        for (const amw in this.state.amwToClusterId) {
            if (Object.hasOwnProperty.call(this.state.amwToClusterId, amw)) {
                const clusterId = this.state.amwToClusterId[amw];
                if (clusterId.toLowerCase().includes(newDefaultCluster.toLowerCase())) {
                    this.setState({ workspaceName: amw });
                    foundAMW = true;
                    break;
                }
            }
        }

        // if the workspace was found, select the right datasource from it
        if (foundAMW) {
            const promDatasource = this.state.datasources.filter((ds) => (ds.jsonData as any)?.directUrl.toLowerCase().includes(this.state.workspaceName?.toLowerCase()))
            this.setState({ defaultDatasource: promDatasource[0] });
        } else {
            this.setState({ defaultDatasource: undefined, workspaceName: undefined});
        }

        AKSConfiguration.setConfigState({ ...this.state });
    };

    public onDatasourceChange = (newDatasource?: DataSourceRef) => {
        if (!!newDatasource) {
            this.setState({ defaultDatasource: newDatasource });
        }
    }

    public constructor(state?: Partial<ConfigurationState>, setConfigState?: (configState: Partial<ConfigurationState>) => void) {
        const datasourceSrv = getDataSourceSrv();
        const promDatasources = datasourceSrv.getList().filter((ds) => ds.type === "prometheus") ?? [];
        super({ 
                clusters: state?.clusters ?? [], 
                defaultCluster: state?.defaultCluster ?? "",
                datasources: promDatasources,
                ...state 
            });
        this.addActivationHandler(() => this.activationHandler());
        if (setConfigState) {
            AKSConfiguration.setConfigState = setConfigState;
        }
    }

    private activationHandler() {
        const sourceData = sceneGraph.getData(this);
        this._subs.add(sourceData.subscribeToState((state) => {
            if (state.data?.state === LoadingState.Done) {
                const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
                const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
                this.setState({ clusters: clusterData[0]?.fields[0]?.values });
                this.createMapFromSeries(workspaceData[0]?.fields[0]?.values ?? [], workspaceData[0]?.fields[1]?.values ?? []);
            }
        }));
    }

    private createMapFromSeries(workspaces: string[], ids: string[]) {
        const amwToClusterId: Record<string, string> = {};

        for (let i = 0; i < workspaces.length; i++) {
            amwToClusterId[workspaces[i]] = ids[i];
        }
        this.setState({ amwToClusterId: amwToClusterId });
    }
}
