import { DataSourceInstanceSettings } from "@grafana/data";
import { getDataSourceSrv } from "@grafana/runtime";
import { SceneQueryRunner } from "@grafana/scenes";
import { DataQuery, DataSourceRef } from "@grafana/schema";
import { ClusterMapping } from "types";
import { MetricsQueryDimensionFiter } from "./types";
import { AZMON_DS_VARIABLE } from "../../../constants";


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
export function createMappingFromSeries(workspaces: string[], workspaceIds: string[], clusters: string[], clusterIds: string[],  laws?: string[]): Record<string, ClusterMapping> {
    const datasourceSrv  = getDataSourceSrv();
    const promDatasources = datasourceSrv.getList().filter((ds) => ds.type === "prometheus") ?? [];
    const clusterMappings: Record<string, ClusterMapping> = {};
    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
      const cluster = clusters[clusterIdx];
      const [amw, workspaceId] = getAMWToGrana(workspaces, workspaceIds, cluster);
      let law = "";
      let clusterId = "";
      let promDs = undefined
      law = !!laws ? laws[clusterIdx] : "";
      clusterId = clusterIds[clusterIdx];
  
      if (!!amw) {
        promDs = promDatasources.find((ds) => (ds.jsonData as any)?.directUrl.toLowerCase().includes(amw.toLowerCase()));
      }
  
      const clusterMapping: ClusterMapping = {
        cluster: cluster,
        workspaceId: workspaceId,
        amw: amw,
        promDs: promDs,
        law: law,
        clusterId: clusterId
      }
  
      clusterMappings[cluster] = clusterMapping;
    }
    
    return clusterMappings;
}

export function getAMWToGrana(workspaces: string[], workspaceIds: string[], cluster: string): [string, string | undefined] {
    const workspaceId = workspaceIds.find((id) => id.toLowerCase().includes(cluster.toLowerCase()));
    let idIdx = -1;
    let amw = "";

    if (!!workspaceId) {
        idIdx = workspaceIds.indexOf(workspaceId);
    }

    if (idIdx !== -1) {
        amw = workspaces[idIdx];
    }

    return [amw, workspaceId];
}
 
export function getPromDatasource(clusterMappings: Record<string, ClusterMapping>, datasources:  DataSourceInstanceSettings[]) {
    const promDatasourceFromMapping = Object.entries(clusterMappings).find(([_, clusterMapping]) => clusterMapping.promDs !== undefined);
    if (!!promDatasourceFromMapping) {
        return promDatasourceFromMapping[1].promDs;
    }

    return undefined;
}

export function getInstanceDatasourcesForType(dsType: string) {
    const datasourceSrv  = getDataSourceSrv();
    const foundDatasources = datasourceSrv.getList().filter((ds) => ds.type === dsType) ?? [];

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

