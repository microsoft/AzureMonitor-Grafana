import { EmbeddedScene, SceneFlexLayout, SceneFlexItem, PanelBuilders, SceneRouteMatch, SceneAppPage } from "@grafana/scenes";
import { AZMON_DS_VARIABLE, CLUSTER_VARIABLE, PROM_DS_VARIABLE, SUBSCRIPTION_VARIABLE } from "../../../constants";
import { azure_monitor_queries } from "../Queries/queries";
import { getDataSourcesVariableForType, getSubscriptionVariable, getResourceGraphVariable } from "../Variables/variables";

export function getGenericSceneAppPage(title: string, url: string, getScene: (routeMatch: SceneRouteMatch<{}>) => EmbeddedScene) {
    return new SceneAppPage({
        title: title,
        url: url,
        getScene: getScene,
    });
}
export function getMissingDatasourceScene(missingDs: string) {
    return new EmbeddedScene({
        body: new SceneFlexLayout({
            direction: 'column',
            children: [
                new SceneFlexItem({
                    width: '50%',
                    height: 300,
                    body: PanelBuilders.text().setTitle('Panel title').setOption('content', `No ${missingDs} datasources found, plese go to connections and add at least one`).build(),
                })
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
