import { SUBSCRIPTION_VARIABLE } from "../../../constants";

interface QueryMap {
  [key: string]: string;
}
export function clusterOverviewQueryProm(cluster: string): string {
    return `last_over_time((kube_namespace_status_phase{cluster =~ "${cluster}"}[1m]))`;
} 


export function clusterOverviewQueryAzure(cluster: string): string {
    return `alertsmanagementresources\r\n| where tolower(subscriptionId) == tolower("\${${SUBSCRIPTION_VARIABLE}}")\r\n| where type == "microsoft.alertsmanagement/alerts"\r\n| extend ruleType = properties.essentials.monitorService\r\n| where ruleType == "Prometheus"\r\n| join kind=leftouter (ResourceContainers | where type==\'microsoft.resources/subscriptions\' and tolower(subscriptionId) == tolower("\${${SUBSCRIPTION_VARIABLE}}") | project SubName=name, subscriptionId) on subscriptionId\r\n| project   AlertName = properties.context.labels.alertname,Cluster = properties.context.labels.cluster ,Container = properties.context.labels.container,namespace = tostring(properties.context.labels.namespace) ,pod = properties.context.labels.pod\r\n| where Cluster =~ "${cluster}"| summarize Alerts= count() by namespace`;
}


const namespacesQueryAzure =
  'alertsmanagementresources\r\n| where type == "microsoft.alertsmanagement/alerts"\r\n| extend ruleType = properties.essentials.monitorService\r\n| where ruleType == "Prometheus"\r\n| project namespace = tostring(properties.context.labels.namespace)\r\n| distinct namespace';
const clustersQueryAzure =
  'resources\r\n| where [\'type\'] == "microsoft.containerservice/managedclusters"\r\n| project tolower(name), id, law = tostring(properties.addonProfiles.omsagent.config.logAnalyticsWorkspaceResourceID)';
const clustersVariableQuery = 'resources\r\n| where [\'type\'] == "microsoft.containerservice/managedclusters"\r\n| distinct tolower(name)';
const workspaceNameAzure =
  'resources\r\n| where type == "microsoft.insights/datacollectionrules"\r\n| extend ma = properties.destinations.monitoringAccounts\r\n| extend flows = properties.dataFlows\r\n| mv-expand flows\r\n| where flows.streams contains "Microsoft-PrometheusMetrics"\r\n| mv-expand ma\r\n| where array_index_of(flows.destinations, tostring(ma.name)) != -1\r\n| project dcrId = tolower(id), azureMonitorWorkspaceResourceId=tolower(tostring(ma.accountResourceId))\r\n| join (insightsresources\r\n| project dcrId = tolower(tostring(parse_json(properties).dataCollectionRuleId)), dcraName = name, id\r\n        ) on dcrId\r\n    | join kind=leftouter (resources\r\n    | where type == "microsoft.dashboard/grafana"\r\n    | extend amwIntegrations = properties.grafanaIntegrations.azureMonitorWorkspaceIntegrations\r\n    | mv-expand amwIntegrations\r\n    | extend azureMonitorWorkspaceResourceId = tolower(tostring(amwIntegrations.azureMonitorWorkspaceResourceId))\r\n    | where azureMonitorWorkspaceResourceId != ""\r\n    | extend grafanaObject = pack("grafanaResourceId", tolower(id), "grafanaWorkspaceName", name, "grafanaEndpoint", properties.endpoint)\r\n    | summarize associatedGrafanas=make_list(grafanaObject) by azureMonitorWorkspaceResourceId) on azureMonitorWorkspaceResourceId\r\n    | extend amwToGrafana = pack("azureMonitorWorkspaceResourceId", azureMonitorWorkspaceResourceId, "associatedGrafanas", associatedGrafanas)\r\n    | summarize amwToGrafanas=make_list(amwToGrafana) by dcrId, dcraName, id\r\n    | project workspace = tostring(split(amwToGrafanas[0].azureMonitorWorkspaceResourceId, "/")[-1]), id';

export const azure_monitor_queries: QueryMap = {
  namespacesQuery: namespacesQueryAzure,
  clustersQuery: clustersQueryAzure,
  workspaceNameQuery: workspaceNameAzure,
  clustersVariableQuery: clustersVariableQuery,
};
