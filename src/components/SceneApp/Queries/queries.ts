import { SUBSCRIPTION_VARIABLE } from "../../../constants";

interface QueryMap {
  [key: string]: string;
}
export function clusterOverviewQueryProm(cluster: string): string {
    return `last_over_time((kube_namespace_status_phase{cluster =~ "${cluster}"}[1m]))`;
} 


export function clusterOverviewQueryAzure(cluster: string): string {
    return `alertsmanagementresources
    | where tolower(subscriptionId) == tolower("\${${SUBSCRIPTION_VARIABLE}}")
    | where type =~ "microsoft.alertsmanagement/alerts"
    | extend ruleType = properties.essentials.monitorService
    | where ruleType == "Prometheus"
    | join kind=leftouter (
      ResourceContainers 
      | where type=~'microsoft.resources/subscriptions' and tolower(subscriptionId) == tolower("\${${SUBSCRIPTION_VARIABLE}}")
      | project SubName=name, subscriptionId) on subscriptionId
    | project AlertName = properties.context.labels.alertname, Cluster = properties.context.labels.cluster, Container = properties.context.labels.container, namespace = tostring(properties.context.labels.namespace), pod = properties.context.labels.pod
    | where Cluster =~ "${cluster}"
    | summarize Alerts= count() by namespace`;
}


const namespacesQueryAzure =
  `alertsmanagementresources
  | where type =~ "microsoft.alertsmanagement/alerts"
  | extend ruleType = properties.essentials.monitorService
  | where ruleType == "Prometheus"
  | project namespace = tostring(properties.context.labels.namespace)
  | distinct namespace`;
const clustersQueryAzure =
  `resources
    | where type =~ 'Microsoft.ContainerService/managedClusters'     
    | project id, name, subscriptionId, aksproperties = parse_json(tolower(properties))
    | extend isEnabled = aksproperties.addonprofiles.omsagent.enabled     
    | extend law = iif(isEnabled == true, aksproperties.addonprofiles.omsagent.config.loganalyticsworkspaceresourceid, '')
    | project tolower(name), id, law, subscriptionId`;
const clustersVariableQuery = 
  `resources
  | where type =~ 'Microsoft.ContainerService/managedClusters'
  | distinct tolower(name)`;
const workspaceNameAzure =
  `resources
  | where type =~ "microsoft.insights/datacollectionrules"
  | extend ma = properties.destinations.monitoringAccounts
  | extend flows = properties.dataFlows
  | mv-expand flows
  | where flows.streams contains "Microsoft-PrometheusMetrics"
  | mv-expand ma
  | where array_index_of(flows.destinations, tostring(ma.name)) != -1
  | project dcrId = tolower(id), azureMonitorWorkspaceResourceId=tolower(tostring(ma.accountResourceId))
  | join (
    insightsresources
    | project dcrId = tolower(tostring(parse_json(properties).dataCollectionRuleId)), dcraName = name, id) on dcrId 
  | join kind=leftouter (
    resources | where type == "microsoft.dashboard/grafana"
    | extend amwIntegrations = properties.grafanaIntegrations.azureMonitorWorkspaceIntegrations
    | mv-expand amwIntegrations
    | extend azureMonitorWorkspaceResourceId = tolower(tostring(amwIntegrations.azureMonitorWorkspaceResourceId))
    | where azureMonitorWorkspaceResourceId != ""
    | extend grafanaObject = pack("grafanaResourceId", tolower(id), "grafanaWorkspaceName", name, "grafanaEndpoint", properties.endpoint)
    | summarize associatedGrafanas=make_list(grafanaObject) by azureMonitorWorkspaceResourceId) on azureMonitorWorkspaceResourceId
  | extend amwToGrafana = pack("azureMonitorWorkspaceResourceId", azureMonitorWorkspaceResourceId, "associatedGrafanas", associatedGrafanas)
  | summarize amwToGrafanas=make_list(amwToGrafana) by dcrId, dcraName, id
  | project workspace = tostring(split(amwToGrafanas[0].azureMonitorWorkspaceResourceId, "/")[-1]), id`;

export const azure_monitor_queries: QueryMap = {
  namespacesQuery: namespacesQueryAzure,
  clustersQuery: clustersQueryAzure,
  workspaceNameQuery: workspaceNameAzure,
  clustersVariableQuery: clustersVariableQuery,
};
