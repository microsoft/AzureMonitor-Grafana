import { DataFrame, DataLink } from "@grafana/data";
import { CustomTransformOperator, SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { DataSourceRef } from "@grafana/schema";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { Observable, map } from "rxjs";
import { CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE, WORKLOAD_VAR } from "../../../constants";
import { formatReadyTotal, getCustomFieldConfigBadge, getDataLink, getValidInvalidCustomFieldConfig } from "./dataUtil";
import { getAzureResourceGraphQuery, getPrometheusQuery } from "./queryUtil";

export function GetClusterByWorkloadQueries() {
    const promDs: DataSourceRef = {
      type: "prometheus",
      uid: `\${${PROM_DS_VARIABLE}}`
    }; 
    const azureQueryRaw = `alertsmanagementresources\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| extend ruleType = properties.essentials.monitorService, cluster = properties.context.labels.cluster\r\n| where ruleType == \"Prometheus\" and tolower(cluster) == tolower("\${${CLUSTER_VARIABLE}}") \r\n| project   AlertName = properties.context.labels.alertname,Cluster = properties.context.labels.cluster ,container = tostring(properties.context.labels.container),namespace = properties.context.labels.namespace ,pod = properties.context.labels.pod\r\n| summarize Alerts = count() by container\r\n`;
    const promQueriesRaw = [
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{workload_type=\"deployment\", cluster =~ \"\${${CLUSTER_VARIABLE}}\", namespace =~ \"\${${NS_VARIABLE}}\"}`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{workload_type=\"deployment\", cluster =~ \"\${${CLUSTER_VARIABLE}}\", namespace =~ \"\${${NS_VARIABLE}}\"} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_available {namespace =~ \"\${${NS_VARIABLE}}\"}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{workload_type=\"deployment\", cluster =~ \"\${${CLUSTER_VARIABLE}}\", namespace =~ \"\${${NS_VARIABLE}}\"} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_ready{namespace =~ \"\${${NS_VARIABLE}}\"}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{workload_type=\"deployment\", cluster =~ \"\${${CLUSTER_VARIABLE}}\", namespace =~ \"\${${NS_VARIABLE}}\"} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_status_replicas_updated {namespace =~ \"\${${NS_VARIABLE}}\"}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`,
      `kube_pod_container_info * on(pod) group_left(namespace, workload, workload_type)  namespace_workload_pod:kube_pod_owner:relabel{workload_type=\"deployment\", cluster =~ \"\${${CLUSTER_VARIABLE}}\", namespace =~ \"\${${NS_VARIABLE}}\"} * on(workload) group_left sum by (workload) (label_replace(max(kube_deployment_spec_replicas {namespace =~ \"\${${NS_VARIABLE}}\"}) by (deployment,namespace,cluster), \"workload\",\"$1\",\"deployment\",\"(.+)\"))`
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

export function TransfomClusterByWorkloadData(data: SceneQueryRunner, pluginReporter: Reporter) {
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
          customTranformCellOptions(pluginReporter),
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
                  "Value #E (sum)": 5,
                  "Value #C (sum)": 6,
                },
                renameByName: {
                  "workload 1": "Workload",
                  "namespace 1": "Namespace",
                  "workload_type 1": "Workload Type",
                  "Value #E (sum)": "Updated",
                  "Value #C (sum)": "Available",
                  "Value #D": "Ready / Total",
                  "Value #F": "Total",
                }
              }
          },
          {
              id: "convertFieldType",
              options: {
                conversions: [
                  {
                    destinationType: "enum",
                    targetField: "container (uniqueValues)"
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
                  "Alerts (sum)": true,
                  "Total": true,
                },
                indexByName: {},
                renameByName: {}
              }
          },
          {
            id: "filterByValue",
            options: {
              filters: [
                {
                  fieldName: "Workload",
                  config: {
                    id: "isNotNull",
                    options: {}
                  }
                }
              ],
              type: "include",
              match: "all"
            }
          }
        ]
    });

    return transformedData;
}

const customTranformCellOptions: (pluginReporter: Reporter) => CustomTransformOperator =
(pluginReporter: Reporter) =>
() =>
(source: Observable<DataFrame[]>) => {
    return source.pipe(
        map(dataFrames => GetIconsOnCells(dataFrames, pluginReporter))
    );
}

function GetIconsOnCells(dataFrames: DataFrame[], pluginReporter: Reporter): DataFrame[] {
  const newFrames: DataFrame[] = [];
  try {
    for (const frame of dataFrames) {
      const newFields = frame.fields.map((field) => {
        if (field.name === "Value #D") {
          // parse ready / total and add icon
          const totalField = frame.fields.find((f) => f.name === "Value #F");
          const newReadyFieldValues = field.values.map((value, idx) => {
            return formatReadyTotal(value, totalField?.values[idx]);
          });
          field.values = newReadyFieldValues;
        }
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
  } catch (e) {
    pluginReporter.reportException("grafana_plugin_geticonsoncells_failed", {
      reporter: "Scene.Main.WorkloadsScene",
      exception: e instanceof Error ? e : new Error(JSON.stringify(e)),
      type: ReportType.Exception,
      trigger: "page"
    });
    throw new Error(`Error transforming data: ${e}`);
  }
  return newFrames;
}

function getFieldConfigForField(name: string) {
  const workloadLinks: DataLink[] = [
    {
      title: "Drill down to Compute Resources",
      url: getDataLink(`${ROUTES.Workloads}/${ROUTES.ComputeResources}`, true, true, `var-${NS_VARIABLE}=\${__data.fields.namespace}&var-${WORKLOAD_VAR}=\${__data.fields.workload}&\${${CLUSTER_VARIABLE}:queryparam}&\${${SUBSCRIPTION_VARIABLE}:queryparam}`),
      targetBlank: false
    }
  ];

  const alertLinks: DataLink[] = [
    {
      title: "Drill down to Alert Summary",
      url: getDataLink(`${ROUTES.Workloads}/${ROUTES.AlertSummary}/\${__data.fields.namespace}`, true, false, `\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}`),
      targetBlank: false
    }
  ];
  switch(name) {
    case "Cluster Alerts":
      return getValidInvalidCustomFieldConfig(150, "times-circle", "red", (value) => (value as number) === 0, alertLinks);
    case "Value #D":
      return getValidInvalidCustomFieldConfig(150, "exclamation-circle", "orange", (value) => {
        const values = (value as string).split("/").map((v) => parseInt(v, 10));
        const diff = values[1] - values[0];
        return diff === 0;
      });
    case "workload_type":
      return getCustomFieldConfigBadge("blue");
    case "workload":
      return { links: workloadLinks}
    default:
      return {};
  }
}
