interface QueryMap {
    [key: string]: string;
}
const amwquery = "resources\r\n| where type == \"microsoft.insights/datacollectionrules\"\r\n| extend ma = properties.destinations.monitoringAccounts\r\n| extend flows = properties.dataFlows\r\n| mv-expand flows\r\n| where flows.streams contains \"Microsoft-PrometheusMetrics\"\r\n| mv-expand ma\r\n| where array_index_of(flows.destinations, tostring(ma.name)) != -1\r\n| project dcrId = tolower(id), azureMonitorWorkspaceResourceId=tolower(tostring(ma.accountResourceId))\r\n| join kind=leftouter (resources\r\n| where type == \"microsoft.dashboard/grafana\"\r\n| extend amwIntegrations = properties.grafanaIntegrations.azureMonitorWorkspaceIntegrations\r\n| mv-expand amwIntegrations\r\n| extend azureMonitorWorkspaceResourceId = tolower(tostring(amwIntegrations.azureMonitorWorkspaceResourceId))\r\n| where azureMonitorWorkspaceResourceId != \"\"\r\n| extend grafanaObject = pack(\"grafanaResourceId\", tolower(id), \"grafanaWorkspaceName\", name, \"grafanaEndpoint\", properties.endpoint)\r\n| summarize associatedGrafanas=make_list(grafanaObject) by azureMonitorWorkspaceResourceId) on azureMonitorWorkspaceResourceId\r\n| extend amwToGrafana = pack(\"azureMonitorWorkspaceResourceId\", azureMonitorWorkspaceResourceId, \"associatedGrafanas\", associatedGrafanas)\r\n| summarize amwToGrafanas=make_list(amwToGrafana) by dcrId\r\n| project tostring(split(amwToGrafanas[0].azureMonitorWorkspaceResourceId, \"/\")[-1])";

export const queries: QueryMap = {
    amwquery: amwquery,
}
