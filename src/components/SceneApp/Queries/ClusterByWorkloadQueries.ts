import { DataFrame, DataLink } from "@grafana/data";
import { CustomTransformOperator, SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { DataSourceRef } from "@grafana/schema";
import { Observable, map } from "rxjs";
import { AZMON_DS_VARIABLE, CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE, SUBSCRIPTION_VARIABLE, WORKLOAD_VAR } from "../../../constants";
import { getCustomFieldConfigBadge, getValidInvalidCustomFieldConfig } from "./dataUtil";
import { getAzureResourceGraphQuery, getPrometheusQuery } from "./queryUtil";

export function GetClusterByWorkloadQueries(namespace: string) {
    const promDs: DataSourceRef = {
      type: "prometheus",
      uid: `\${${PROM_DS_VARIABLE}}`
    }; 
    const azureQueryRaw = `alertsmanagementresources\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| extend ruleType = properties.essentials.monitorService, cluster = properties.context.labels.cluster\r\n| where ruleType == \"Prometheus\" and tolower(cluster) == tolower("\${${CLUSTER_VARIABLE}}") \r\n| project   AlertName = properties.context.labels.alertname,Cluster = properties.context.labels.cluster ,container = tostring(properties.context.labels.container),namespace = properties.context.labels.namespace ,pod = properties.context.labels.pod\r\n| summarize Alerts = count() by container\r\n`;
    const workloadTypeFilter = namespace.length > 0 ? `workload_type=\"deployment\", namespace = "${namespace}"` : "workload_type=\"deployment\"";
    const namespaceFilter = namespace.length > 0 ? `namespace = "${namespace}"` : "";
    const promQueriesRaw = [
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{${workloadTypeFilter}}`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{${workloadTypeFilter}} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_available {${namespaceFilter}}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{${workloadTypeFilter}} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_ready{${namespaceFilter}}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{${workloadTypeFilter}} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_updated {${namespaceFilter}}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{${workloadTypeFilter}} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_spec_replicas {${namespaceFilter}}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`
    ];
    let idx = 'B'.charCodeAt(0);
    const promQueries = [];
    const azureSceneQuery = getAzureResourceGraphQuery(azureQueryRaw, `\$${SUBSCRIPTION_VARIABLE}`, 'A');
    for (const query of promQueriesRaw) {
      promQueries.push(getPrometheusQuery(query, String.fromCharCode(idx), 'table', promDs));
      idx++;
    }

    return [azureSceneQuery, ...promQueries];
}

export function TransfomClusterByWorkloadData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                id: "joinByField",
                options: {
                  byField: "container",
                  mode: "outer"
                }
            },
            {
                id: "groupBy",
                options: {
                  fields: {
                    Alerts: {
                        aggregations: [
                        "sum"
                      ],
                      operation: "aggregate"
                    },
                    "Value #C": {
                      aggregations: [
                        "sum"
                      ],
                      operation: "aggregate"
                    },
                    "Value #D": {
                      aggregations: [
                        "sum"
                      ],
                      operation: "groupby"
                    },
                    "Value #E": {
                        aggregations: [
                        "sum"
                      ],
                      operation: "aggregate"
                    },
                    "Value #F": {
                      aggregations: [
                        "sum"
                      ],
                      operation: "groupby"
                    },
                    cluster: {
                      aggregations: []
                    },
                    "cluster 1": {
                      aggregations: []
                    },
                    container: {
                      aggregations: [
                        "uniqueValues"
                      ]
                    },
                    container_id: {
                      aggregations: [
                        "uniqueValues"
                      ]
                    },
                    "container_id 1": {
                      aggregations: [],
                      operation: "groupby"
                    },
                    namespace: {
                      aggregations: [],
                      operation: "groupby"
                    },
                    "namespace 1": {
                      aggregations: [],
                      operation: "groupby"
                    },
                    workload: {
                      aggregations: [],
                      operation: "groupby"
                    },
                    "workload 1": {
                      aggregations: [],
                      operation: "groupby"
                    },
                    workload_type: {
                      aggregations: [],
                      operation: "groupby"
                    }
                  }
                }
            },
            {
                id: "calculateField",
                options: {
                  alias: "Ready / Total",
                  binary: {
                    left: "Value #F (sum)",
                    operator: "-",
                    reducer: "sum",
                    right: "Value #D (sum)"
                  },
                  mode: "reduceRow",
                  reduce: {
                    include: [
                      "Value #D",
                      "Value #F"
                    ],
                    reducer: "diff"
                  }
                }
            },
            {
              id: "calculateField",
              options: {
                alias: "Cluster Alerts",
                mode: "reduceRow",
                reduce: {
                  include: [
                    "Alerts (sum)"
                  ],
                  reducer: "sum"
                }
              }
          },
            customTranformCellOptions(),
            {
                id: "organize",
                options: {
                  excludeByName: {
                    "namespace 2": true,
                    "namespace 3": true,
                    "namespace 4": true,
                    "namespace 5": true,
                    "workload 2": true,
                    "workload 3": true,
                    "workload 4": true,
                    "workload 5": true,
                    "workload_type 2": true,
                    "workload_type 3": true,
                    "workload_type 4": true,
                    "workload_type 5": true
                  },
                  indexByName: {
                    "workload 1": 0,
                    "namespace 1": 1,
                    "workload_type 1": 2,
                    "Value #D": 3,
                    "Value #F": 4,
                    "Ready / Total": 5,
                    "Value #E (sum)": 6,
                    "Value #C (sum)": 7,
                  },
                  renameByName: {
                    "workload 1": "Workload",
                    "namespace 1": "Namespace",
                    "workload_type 1": "Workload Type",
                    "Value #E (sum)": "Updated",
                    "Value #C (sum)": "Available",
                    "Value #D": "Ready",
                    "Value #F": "Total",
                  }
                }
            },
            {
                id: "convertFieldType",
                options: {
                  conversions: [
                    {
                      destinationType: "string",
                      targetField: "Ready"
                    },
                    {
                      destinationType: "string",
                      targetField: "Total"
                    },
                    {
                      destinationType: "enum",
                      targetField: "container (uniqueValues)"
                    },
                    {
                      destinationType: "string",
                      targetField: "Ready / Total"
                    }
                  ],
                  fields: {}
                }
            },
            {
                id: "organize",
                options: {
                  excludeByName: {
                    Alerts: false,
                    "Alerts (sum)": true
                  },
                  indexByName: {},
                  renameByName: {
                    "Ready / Total": "Not Ready"
                  }
                }
            },
        ]
    });

    return transformedData;
}

const customTranformCellOptions: () => CustomTransformOperator =
() =>
() =>
(source: Observable<DataFrame[]>) => {
    return source.pipe(
        map(dataFrames => GetIconsOnCells(dataFrames))
    );
}

function GetIconsOnCells(dataFrames: DataFrame[]): DataFrame[] {
  const newFrames: DataFrame[] = [];
  for (const frame of dataFrames) {
    const newFields = frame.fields.map((field) => {
      const fieldWithConfig = {
        ...field,
        config: getFieldConfigForField(field.name)
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

function getFieldConfigForField(name: string) {
  const workloadLinks: DataLink[] = [
    {
      title: "Drill down to Compute Resources",
      url: `/a/azure-cloudnativemonitoring-app/clusternavigation/workload/computeresources?var-${NS_VARIABLE}=\${__data.fields.namespace}&var-${WORKLOAD_VAR}=\${__data.fields.workload}&\${${PROM_DS_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}&\${${SUBSCRIPTION_VARIABLE}:queryparam}`,
      targetBlank: false
    }
  ];

  const alertLinks: DataLink[] = [
    {
      title: "Drill down to Alert Summary",
      url: `/a/azure-cloudnativemonitoring-app/clusternavigation/workloads/alertsummary/\${__data.fields.namespace}?\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${AZMON_DS_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}`,
      targetBlank: false
    }
  ];
  switch(name) {
    case "Cluster Alerts":
      return getValidInvalidCustomFieldConfig(150, "times-circle", "red", (value) => (value as number) === 0, alertLinks);
    case "Ready / Total":
      return getValidInvalidCustomFieldConfig(150, "exclamation-circle", "orange", (value) => parseInt(value as string, 10) === 0);
    case "workload_type":
      return getCustomFieldConfigBadge("blue");
    case "workload":
      return { links: workloadLinks}
    default:
      return {};
  }
}
