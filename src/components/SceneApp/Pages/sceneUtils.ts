import { EmbeddedScene, SceneFlexLayout, SceneFlexItem, PanelBuilders, SceneRouteMatch, SceneAppPage } from "@grafana/scenes";
import { AZMON_DS_VARIABLE, AZURE_MONITORING_PLUGIN_ID, CLUSTER_VARIABLE, PROM_DS_VARIABLE, SUBSCRIPTION_VARIABLE } from "../../../constants";
import { azure_monitor_queries } from "../Queries/queries";
import { getDataSourcesVariableForType, getSubscriptionVariable, getResourceGraphVariable } from "../Variables/variables";
import { TelemetryClient } from "telemetry/telemetry";
import { ReportType } from "telemetry/types";

export function getGenericSceneAppPage(title: string, url: string, getScene: (routeMatch: SceneRouteMatch<{}>) => EmbeddedScene) {
    return new SceneAppPage({
        title: title,
        url: url,
        getScene: getScene,
    });
}
export function getMissingDatasourceScene(missingDs: string, reporter: string, telemetryClient: TelemetryClient) {
    telemetryClient.reportPageView("grafana_plugin_missingdsscene_view", {
        reporter: reporter,
        missingDatasource: missingDs,
        type: ReportType.PageView,
    });
    return new EmbeddedScene({
        body: new SceneFlexLayout({
            direction: 'column',
            children: [
                new SceneFlexItem({
                    width: '100%',
                    height: 300,
                    body: PanelBuilders.text().setTitle("").setOption('content', 
                        `> ### ⚠️ No ${missingDs} datasources found <br>\n> ##### This plugin requires Azure Monitor and Prometheus datasources to work.  \n> ##### Please go to [connections](/connections/datasources) configure the appropriate datasources. For more information, see our [documentation](/plugins/${AZURE_MONITORING_PLUGIN_ID})`).setDisplayMode("transparent").build(),
                }),
            ],
        }),
    });
}

export function getSharedSceneVariables(drilldownScene: boolean) {
    const variables = [];
    variables.push(getDataSourcesVariableForType("grafana-azure-monitor-datasource", AZMON_DS_VARIABLE, "Azure Monitor Datasource", drilldownScene));
    variables.push(getSubscriptionVariable(drilldownScene));
    variables.push(getResourceGraphVariable(azure_monitor_queries["clustersVariableQuery"], `\$${SUBSCRIPTION_VARIABLE}`, CLUSTER_VARIABLE, "AKS Cluster", "Select a cluster", false));
    variables.push(getDataSourcesVariableForType("prometheus", PROM_DS_VARIABLE, "Prometheus Datasource", true))
  
    return variables;
}
