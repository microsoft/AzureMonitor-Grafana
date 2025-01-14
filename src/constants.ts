import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  Home = "clusternavigation",
  // main views
  Clusters = "clusters",
  Namespaces = "namespaces",
  Workloads = "workloads",
  Nodes = "nodes",
  // drilldowns
  AlertSummary = "alertsummary",
  ComputeResources = "computeresources",
  PodsDrilldown = "pods/logs/drilldown",
}

export const SUBSCRIPTION_VARIABLE = "subscription";
export const CLUSTER_VARIABLE = "cluster";
export const NS_VARIABLE = "namespace";
export const WORKLOAD_VAR = "workload";
export const AZMON_DS_VARIABLE = "azmon_ds";
export const PROM_DS_VARIABLE = "prom_ds";
export const AGG_VAR = "aggregation";
export const POD_VAR = "pod";
export const NODE_VAR = "node";
export const AZURE_MONITORING_PLUGIN_ID = "azure-monitor-app"
export const VAR_ALL = "$__all";
