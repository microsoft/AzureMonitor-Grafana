import { getDataSourceSrv } from "@grafana/runtime";
import { SceneQueryRunner } from "@grafana/scenes";
import { DataQuery, DataSourceRef } from "@grafana/schema";
import { DataSourceInstanceSettings } from "@grafana/data";
import { ClusterMapping } from "types";
import { AZMON_DS_VARIABLE } from "../../../constants";
import { MetricsQueryDimensionFiter } from "./types";

// Datasource plugin types that represent a Prometheus-compatible datasource.
// Azure Monitor Managed Prometheus can surface either as the core "prometheus"
// plugin (with Azure auth) or as the dedicated "grafana-azureprometheus-datasource".
export const PROM_DS_TYPES = ["prometheus", "grafana-azureprometheus-datasource"];

export function getAzureResourceGraphQuery(query: string, subscription: string, refId: string) {
     return {
        datasource: {
            type: "grafana-azure-monitor-datasource",
            uid:`\${${AZMON_DS_VARIABLE}}`
        },
        refId: refId,
        queryType: "Azure Resource Graph",
        azureResourceGraph:{
            query: query,
        },
        subscriptions: [`${subscription}`]
    }
}

export function getLogAnalyticsQuery(query: string, workspace: string, refId: string, dashboardTime: boolean, resultFormat: string) {
    return {
        datasource: {
            type: "grafana-azure-monitor-datasource",
            uid:`\${${AZMON_DS_VARIABLE}}`
        },
        refId: refId,
        queryType: "Azure Log Analytics",
        azureLogAnalytics: {
            resultformat: resultFormat,
            dashboardTime: dashboardTime,
            resources: [
              workspace
            ],
            query: query,
        }
    }
}

export function getMetricsQuery(refId: string, aggregation: string, timeGrain: string, allowedTimeGrains: number[], resources: string[], metricName: string, dimensionFilters: MetricsQueryDimensionFiter[], customNamespace: string, alias: string) {
    const [subscription, resourceGroup, namespace, resourceName] = parseArmID(resources[0]);
    return {
        datasource: {
            type: "grafana-azure-monitor-datasource",
            uid:`\${${AZMON_DS_VARIABLE}}`
        },
        refId: refId,
        queryType: "Azure Monitor",
        azureMonitor: {
            aggregation: aggregation,
            timeGrain: timeGrain,
            allowedTimeGrainsMs: allowedTimeGrains,
            metricNamespace: namespace,
            resources: [{
                metricNamespace: namespace,
                resourceGroup: resourceGroup,
                resourceName: resourceName,
                subscription: subscription
            }],
            metricName: metricName,
            dimensionFilters: dimensionFilters,
            customNamespace: customNamespace,
            alias: alias
        },
        subscription: subscription
    }
}

export function getPrometheusQuery(query: string, refId: string, format: string, promDs: DataSourceRef, legendFormat?: string, intervalFactor?: number, step?: number, instant?: boolean, _range?: boolean) {
    return {
            datasource: promDs,
            refId: refId,
            expr: query,
            format: format,
            legendFormat: legendFormat,
            intervalFactor: intervalFactor,
            step: step,
            instant: instant
        }
}


export function getSceneQueryRunner(queries: DataQuery[]): SceneQueryRunner {
    const mixedQuery = {
        datasource: {
          type: 'datasource',
          uid: '-- Mixed --',
        },
        queries: queries,
    };

    return new SceneQueryRunner(mixedQuery);
}
export function createMappingFromSeries(workspaces: string[], workspaceIds: string[], clusters: string[], clusterIds: string[], laws?: string[], promEndpoints?: string[]): Record<string, ClusterMapping> {
    const datasourceSrv  = getDataSourceSrv();
    const promDatasources = datasourceSrv.getList().filter((ds) => PROM_DS_TYPES.includes(ds.type)) ?? [];
    const clusterMappings: Record<string, ClusterMapping> = {};
    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
      const cluster = clusters[clusterIdx];
      const [amw, workspaceId, promEndpoint] = getAMWToGrana(workspaces, workspaceIds, cluster, promEndpoints);
      let law = "";
      let clusterId = "";
      let promDs = undefined
      law = !!laws ? laws[clusterIdx] : "";
      clusterId = clusterIds[clusterIdx];
  
      if (!!amw) {
        promDs = matchPromDatasource(promDatasources, promEndpoint, amw);
      }
  
      const clusterMapping: ClusterMapping = {
        cluster: cluster,
        workspaceId: workspaceId,
        amw: amw,
        promDs: promDs,
        promEndpoint: promEndpoint,
        law: law,
        clusterId: clusterId
      }
  
      clusterMappings[cluster] = clusterMapping;
    }
    
    return clusterMappings;
}

// Extracts the lowercased host from a URL, tolerating undefined/malformed input.
export function safeHost(url?: string): string {
    if (!url) {
        return "";
    }
    try {
        return new URL(url).host.toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

// The query URL Grafana uses for a Prometheus datasource. `directUrl` is the
// unproxied endpoint Grafana injects at runtime; fall back to `url`.
function getDatasourceQueryUrl(ds: DataSourceInstanceSettings): string {
    return (ds.jsonData as { directUrl?: string })?.directUrl ?? ds.url ?? "";
}

// Resolve the Prometheus datasource for an Azure Monitor Workspace.
// Primary match is exact host equality against the AMW's Prometheus query
// endpoint (robust in multi-AMW environments). Falls back to the prior
// name-substring behavior (null-safe) so resolution is never worse than before.
function matchPromDatasource(promDatasources: DataSourceInstanceSettings[], promEndpoint: string | undefined, amw: string) {
    const targetHost = safeHost(promEndpoint);
    if (!!targetHost) {
        const byEndpoint = promDatasources.find((ds) => safeHost(getDatasourceQueryUrl(ds)) === targetHost);
        if (byEndpoint) {
            return byEndpoint;
        }
    }

    const amwLower = amw.toLowerCase();
    return promDatasources.find((ds) => getDatasourceQueryUrl(ds).toLowerCase().includes(amwLower));
}

export function getAMWToGrana(workspaces: string[], workspaceIds: string[], cluster: string, promEndpoints?: string[]): [string, string | undefined, string | undefined] {
    const workspaceId = workspaceIds.find((id) => id.toLowerCase().includes(cluster.toLowerCase()));
    let idIdx = -1;
    let amw = "";
    let promEndpoint: string | undefined = undefined;

    if (!!workspaceId) {
        idIdx = workspaceIds.indexOf(workspaceId);
    }

    if (idIdx !== -1) {
        amw = workspaces[idIdx];
        promEndpoint = promEndpoints?.[idIdx];
    }

    return [amw, workspaceId, promEndpoint];
}
 
export function getPromDatasource(clusterMappings: Record<string, ClusterMapping>, cluster: string) {
    const promDatasourceFromMapping = Object.entries(clusterMappings).find(([name, clusterMapping]) => name === cluster && clusterMapping.promDs !== undefined);
    if (!!promDatasourceFromMapping) {
        return promDatasourceFromMapping[1].promDs;
    }

    return undefined;
}

export function getInstanceDatasourcesForType(dsTypes: string | string[]) {
    const types = Array.isArray(dsTypes) ? dsTypes : [dsTypes];
    const datasourceSrv  = getDataSourceSrv();
    const foundDatasources = datasourceSrv.getList().filter((ds) => types.includes(ds.type)) ?? [];

    return foundDatasources;
}


function parseArmID(armId: string) {
    const split = armId.split("/");
    const subscription = split[2];
    const resourceGroup = split[4];
    const metricNamespace = [split[6], split[7]].join("/");
    const resourceName = split[8];

    return [subscription, resourceGroup, metricNamespace, resourceName];
}

