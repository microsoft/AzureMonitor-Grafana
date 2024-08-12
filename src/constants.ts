import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  One = 'one',
  Two = 'two',
  Three = 'three',
  Four = 'four',
}

export const SUBSCRIPTION_VARIABLE = "VAR_SUBSCRIPTION";
export const CLUSTER_VARIABLE = "CLUSTER_VAR";
export const NS_VARIABLE = "NS_VAR";
export const WORKLOAD_VAR = "WORKLOAD_VAR";
export const AZMON_DS_VARIABLE = "AZMON_DS";
export const PROM_DS_VARIABLE = "PROM_DS";
export const AGG_VAR = "AGG_VAR";
export const POD_VAR = "POD_VAR";
export const NODE_VAR = "NODE_VAR";
