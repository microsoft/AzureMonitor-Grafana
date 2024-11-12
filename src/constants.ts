import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  One = 'one',
  Two = 'two',
  Three = 'three',
  Four = 'four',
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

export const CONNECTION_STRING_DEV = "InstrumentationKey=6283f290-cac1-4848-92b3-2b17b8651378;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=98919b78-fa84-46bf-abcb-093bb210d38e";
export const CONNECTION_STRING_PROD = "InstrumentationKey=478e2e63-a020-422f-a0f4-bf1d1aae66cf;IngestionEndpoint=https://centralus-2.in.applicationinsights.azure.com/;LiveEndpoint=https://centralus.livediagnostics.monitor.azure.com/;ApplicationId=d55f24e8-49b0-4e37-9507-e7245e05c4fe";

export const VAR_ALL = "$__all";
