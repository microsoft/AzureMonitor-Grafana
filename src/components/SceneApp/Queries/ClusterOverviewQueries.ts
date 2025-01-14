import { DataFrame, DataLink } from '@grafana/data';
import { CustomTransformOperator, SceneDataTransformer, SceneQueryRunner } from '@grafana/scenes';
import { DataSourceRef } from '@grafana/schema';
import { Observable, map } from 'rxjs';
import { AZMON_DS_VARIABLE, CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE, VAR_ALL } from '../../../constants';
import { GetClusterToSubscription } from './ClusterMappingQueries';
import { getCustomFieldConfigBadge, getDataLink, getValidInvalidCustomFieldConfig } from './dataUtil';
import { getAzureResourceGraphQuery, getPrometheusQuery } from './queryUtil';

export function GetClusterOverviewSceneQueries() {
  const promDs: DataSourceRef = {
    type: "prometheus",
    uid: `\${${PROM_DS_VARIABLE}}`
  };
  const azureQuery = `alertsmanagementresources\r\n| where subscriptionId in~ (\${${SUBSCRIPTION_VARIABLE}})\r\n| where type == "microsoft.alertsmanagement/alerts"\r\n| extend ruleType = properties.essentials.monitorService\r\n| where ruleType == "Prometheus"\r\n| join kind=leftouter (ResourceContainers | where type==\'microsoft.resources/subscriptions\' and subscriptionId in~ (\${${SUBSCRIPTION_VARIABLE}}) | project SubName=name, subscriptionId) on subscriptionId\r\n| project   AlertName = properties.context.labels.alertname,Cluster = properties.context.labels.cluster ,Container = properties.context.labels.container,namespace = tostring(properties.context.labels.namespace) ,pod = properties.context.labels.pod\r\n| where Cluster =~ "\${${CLUSTER_VARIABLE}}"| summarize Alerts= count() by namespace`;
  const promQueryRaw = `last_over_time((kube_namespace_status_phase{cluster =~ "\${${CLUSTER_VARIABLE}}"}[1m]))`;
  const promSceneQuery = getPrometheusQuery(promQueryRaw, 'A', 'table', promDs);
  const azureSceneQueries = getAzureResourceGraphQuery(azureQuery, `\$${SUBSCRIPTION_VARIABLE}`, 'B');
  
  return [...[promSceneQuery], azureSceneQueries];
}

export function TranformClusterOverviewData(data: SceneQueryRunner, clustersData: SceneQueryRunner) {
  const transformedData = new SceneDataTransformer({
    $data: data,
    transformations: [
      {
        id: 'groupBy',
        options: {
          fields: {
            Alerts: {
              aggregations: [],
              operation: 'groupby',
            },
            Value: {
              aggregations: [],
            },
            cluster: {
              aggregations: ['firstNotNull'],
              operation: 'aggregate',
            },
            namespace: {
              aggregations: [],
              operation: 'groupby',
            },
            phase: {
              aggregations: ['first'],
              operation: 'aggregate',
            },
          },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'namespace',
          mode: 'outer',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Alerts',
          mode: 'reduceRow',
          reduce: {
            include: [],
            reducer: 'sum',
          },
        },
      },
      customTranformCellOptions(clustersData),
      {
        id: 'organize',
        options: {
          excludeByName: {
            Alerts: false,
            'Alerts 1': true,
          },
          indexByName: {},
          renameByName: {
            'Alerts 2': 'Alerts',
            namespace: 'Namespace',
            phase: 'Phase',
            'phase (first)': 'Phase',
            'cluster (firstNotNull)': 'Cluster',
          },
        },
      },
    ],
  });

  return transformedData;
}

const customTranformCellOptions: (clustersData: SceneQueryRunner) => CustomTransformOperator =
(clusterData) =>
() =>
(source: Observable<DataFrame[]>) => {
    return source.pipe(
        map(dataFrames => GetIconsOnCells(dataFrames, clusterData))
    );
}

function GetIconsOnCells(dataFrames: DataFrame[], clustersData: SceneQueryRunner): DataFrame[] {
  const clusterToSubscription = GetClusterToSubscription(clustersData);
  const newFrames: DataFrame[] = [];
  for (const frame of dataFrames) {
    const clusters = frame.fields.find((field) => field.name.includes("cluster"));
    const newFields = frame.fields.map((field, ind) => {
      const cluster = clusters?.values?.at(ind);
      let subscription = VAR_ALL;
      if (cluster && clusterToSubscription.has(cluster)) {
        subscription = clusterToSubscription.get(cluster) || VAR_ALL;
      }
      const fieldWithConfig = {
        ...field,
        config: getFieldConfigForField(field.name, subscription)
      }
      return fieldWithConfig;
    });
    newFrames.push({
      ...frame,
      fields: newFields
    });
  }

  return newFrames;
}

function getFieldConfigForField(name: string, subscriptionId: string) {
  const alertLinks: DataLink[] = [
    {
      title: "Drill down to Alert Summary",
      url: getDataLink(`${ROUTES.Namespaces}/${ROUTES.AlertSummary}/\${__data.fields.namespace}`,`\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${AZMON_DS_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}`),
      targetBlank: false
    }
  ];

  const namespaceLinks: DataLink[] = [
    {
      title: "Go to Workload",
      url: getDataLink(ROUTES.Workloads, `var-${NS_VARIABLE}=\${__data.fields.namespace}&var-${SUBSCRIPTION_VARIABLE}=${subscriptionId}&\${${CLUSTER_VARIABLE}:queryparam}&\${${AZMON_DS_VARIABLE}:queryparam}`),
      targetBlank: false
    }
  ]
  switch(name) {
    case "Alerts":
      return getValidInvalidCustomFieldConfig(85, "times-circle", "red", checkValueForAlerts, alertLinks);
    case "phase (first)":
      return getValidInvalidCustomFieldConfig(150, "exclamation-circle", "red", checkValueForPhase);
    case "cluster (firstNotNull)":
      return getCustomFieldConfigBadge("purple");
    case "namespace": 
      return { links: namespaceLinks }
    default:
      return {};
  }
}


function checkValueForAlerts(value: number) {
  return value === 0;
}

function checkValueForPhase(value: string) {
  return value === "active";
}
