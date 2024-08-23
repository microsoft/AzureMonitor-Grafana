import { DataFrame, Field, FieldType } from "@grafana/data";
import { CustomTransformOperator, SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { BarGaugeDisplayMode, BarGaugeValueMode, TableCellDisplayMode, ThresholdsMode } from "@grafana/schema";
import { Observable, map } from "rxjs";
import { ClusterMapping } from "types";
import { SUBSCRIPTION_VARIABLE } from "../../../constants";
import { getThresholdsConfig } from "../Visualizations/utils";
import { getReducerValueFor } from "./dataUtil";
import { getAzureResourceGraphQuery, getLogAnalyticsQuery, getMetricsQuery } from "./queryUtil";
import { ReducerFunctions } from "./types";

const METRIC_COMMON_AGG = "Maximum";
const METRIC_COMMON_TIMEGRAIN = "auto";
const METRIC_COMMON_ALLOWED_TIMEGRAINS = [
    60000,
    300000,
    900000,
    1800000,
    3600000,
    21600000,
    43200000
];
const METRIC_COMMON_NAMESPACE = "microsoft.containerservice/managedclusters";
const METRIC_COMMON_ALIAS = "{{node}}";
const METRIC_COMMON_DIMENSION_FILTERS = [{ dimension: "node", operator: "eq", filters: []}, { dimension: "nodepool", operator: "eq", filters: [] }];

export function GetNodeOverviewQueries(clusterMappings: Record<string, ClusterMapping>, selectedClusters: string[]) {
    const queries = [];
    if (!clusterMappings || !selectedClusters) {
        return [];
    }
    let idx = 'A'.charCodeAt(0);
    const poolPropsRaw = `resources\r\n| where type =~ \"microsoft.containerservice/managedclusters\" and name in~ ('${selectedClusters}')\r\n| project name, poolProperties = properties.agentPoolProfiles, ClusterId = id\r\n| mv-expand poolProperties\r\n| extend name = tostring(poolProperties.name), targetNodes = poolProperties.['count'], provState = tostring(poolProperties.provisioningState), powerState = tostring(poolProperties.powerState.code), clusterName = name\r\n| project-away poolProperties\r\n`;
    queries.push(getAzureResourceGraphQuery(poolPropsRaw, `\$${SUBSCRIPTION_VARIABLE}`, String.fromCharCode(idx)));
    idx++;
    for (const cluster of selectedClusters) {
        const clusterId = clusterMappings[cluster]?.clusterId;
        const nodeQueryRaw = `let trendBinSize = 5m;\r\nlet maxListSize = 1000;\r\nlet clusterId = '${clusterId}';     \r\nlet rawData =     \r\nKubeNodeInventory\r\n     | where $__timeFilter(TimeGenerated)             \r\n     | where ClusterId =~ clusterId          \r\n     | distinct ClusterId, TimeGenerated     \r\n     | summarize ClusterSnapshotCount = count() by Timestamp = bin(TimeGenerated, trendBinSize), ClusterId     \r\n     | join hint.strategy=broadcast (         \r\n        KubeNodeInventory                                  \r\n        | where $__timeFilter(TimeGenerated)             \r\n        | where ClusterId =~ clusterId\r\n        | mv-expand todynamic(Labels)\r\n        | extend pool = tostring(Labels.agentpool)                  \r\n        | summarize ReadyCount = sumif(1, Status contains ('Ready')) \r\n            by ClusterId, pool, Timestamp = bin(TimeGenerated, trendBinSize))\r\n      on ClusterId, Timestamp     \r\n     | project pool, Timestamp, ReadyCount = todouble(ReadyCount) / ClusterSnapshotCount, ClusterId;     \r\nrawData\r\n| summarize avg(ReadyCount) by name = pool, ClusterId`;
        const nodeToPoolRaw = `KubeNodeInventory\r\n| where ClusterName =~ '${cluster}' and $__timeFilter( TimeGenerated)\r\n| mv-expand todynamic(Labels)\r\n| extend pool = tostring(Labels.agentpool)\r\n| distinct Computer, pool`
        const law = clusterMappings[cluster]?.law;
        if (!!law) {
            queries.push(getLogAnalyticsQuery(nodeQueryRaw, law, `${cluster}_NodePool_${String.fromCharCode(idx)}`, false, "time_series"));
            idx++;
            queries.push(getLogAnalyticsQuery(nodeToPoolRaw, law, `${cluster}_NodeToPool_${String.fromCharCode(idx)}`, false, "time_series"));
            idx++;
            queries.push(getMetricsQuery(`${cluster}_CPUUsageMetric_${String.fromCharCode(idx)}`, METRIC_COMMON_AGG, METRIC_COMMON_TIMEGRAIN, METRIC_COMMON_ALLOWED_TIMEGRAINS, [clusterId ?? ""], "node_cpu_usage_percentage", METRIC_COMMON_DIMENSION_FILTERS, METRIC_COMMON_NAMESPACE, METRIC_COMMON_ALIAS));
            idx++
            queries.push(getMetricsQuery(`${cluster}_MemoryUsageMetric_${String.fromCharCode(idx)}`, METRIC_COMMON_AGG, METRIC_COMMON_TIMEGRAIN, METRIC_COMMON_ALLOWED_TIMEGRAINS, [clusterId ?? ""], "node_memory_working_set_percentage", METRIC_COMMON_DIMENSION_FILTERS, METRIC_COMMON_NAMESPACE, METRIC_COMMON_ALIAS));
            idx++
            queries.push(getMetricsQuery(`${cluster}_DiskUsageMetric_${String.fromCharCode(idx)}`, METRIC_COMMON_AGG, METRIC_COMMON_TIMEGRAIN, METRIC_COMMON_ALLOWED_TIMEGRAINS, [clusterId ?? ""], "node_disk_usage_percentage", METRIC_COMMON_DIMENSION_FILTERS, METRIC_COMMON_NAMESPACE, METRIC_COMMON_ALIAS));
            idx++;
        }
    }

    return queries;
}

export function TransformNodeOverviewData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            transformToNestedFrame(),
            {
                id: "merge",
                options: {}
            },
            {
                "id": "organize",
                "options": {
                  "excludeByName": {
                    "ClusterId": true,
                    "clusterName": true
                  },
                  "indexByName": {
                    "name": 0,
                    "provState": 1,
                    "powerState": 2,
                    "targetNodes": 3,
                    "avg_ReadyCount": 4,
                    "ClusterId": 5,
                    "clusterName": 6
                  },
                  "renameByName": {
                    "name": "Node Pool",
                    "provState": "Provisioning state",
                    "powerState": "Power state",
                    "targetNodes": "Target nodes",
                    "avg_ReadyCount": "Ready Nodes",
                  }
                }
              }
        ]
    });

    return transformedData;
}

const transformToNestedFrame: () => CustomTransformOperator = 
    () => 
    () =>
    (source: Observable<DataFrame[]>) => {
        return source.pipe(
            map(dataFrames => GetNestedTable(dataFrames))
        );
}

function GetNestedTable(data: DataFrame[]): DataFrame[] {
    const newFrames: DataFrame[] = [];
    for (const frame of data) {
        const refId = frame.refId;
        if (!!refId && refId.includes("_NodePool_")) {
            const cluster = refId.split("_")[0];
            // find corresponding frame with node to pool mapping
            const nodeToPoolFrame = data.find((f) => f.refId?.includes(`${cluster}_NodeToPool_`));
            const nodeToPoolFields = nodeToPoolFrame?.fields;

            // find corresponding cpu, memory and disk usage frames
            const cpuUsageFrame = data.filter((f) => f.refId?.includes(`${cluster}_CPUUsageMetric_`)) ?? [];
            const memoryUsageFrame = data.filter((f) => f.refId?.includes(`${cluster}_MemoryUsageMetric_`));
            const diskUsageFrame = data.filter((f) => f.refId?.includes(`${cluster}_DiskUsageMetric_`));

            // parent pool row
            const nodePoolFields = frame.fields;
            const parentRowPoolField = nodePoolFields.find((f) => f.name === "name")?.values ?? [];
            // newFrames.push(frame);
            const nestedFrames: DataFrame[][] = [];
            for (let parentRowIdx = 0; parentRowIdx < parentRowPoolField.length; parentRowIdx++) {
                // current node pool parent row
                const poolName = parentRowPoolField[parentRowIdx];

                // field that contains all the nodes, pools, cpu, memory and disk usage that these nodes belong to
                const childNodeField = nodeToPoolFields?.find((f) => f.name === "Computer");
                const childPoolField = nodeToPoolFields?.find((f) => f.name === "pool");
                
                // grab the node and pool that match that parent pool name
                const childNodeValues = childNodeField?.values.filter((_, idx) => childPoolField?.values[idx] === poolName) ?? [];
                const childPoolValues = childPoolField?.values.filter((_, idx) => childPoolField?.values[idx] === poolName) ?? [];

                // create sub frame fields
                const subFrameFields = [
                    {
                        name: "Node",
                        values: childNodeValues,
                        config: {},
                        type: FieldType.string
                    },
                    transformMetricCell(cpuUsageFrame, "CPU", "CPU Usage Percentage", childNodeValues, "max", poolName),
                    transformMetricCell(memoryUsageFrame, "Memory", "Memory Working Set Percentage", childNodeValues, "max", poolName),
                    transformMetricCell(diskUsageFrame, "Disk", "Disk Used Percentage", childNodeValues, "max", poolName),
                    {
                        name: "Node pool",
                        values: childPoolValues,
                        config: {},
                        type: FieldType.string
                    }
                ];
                const newSubFrame: DataFrame = {
                    name: "nested_node_info",
                    refId: `${refId}_nested_${parentRowIdx}`,
                    fields: subFrameFields,
                    length: childNodeValues.length,
                    meta: {
                        preferredVisualisationType: "table",
                    }
                };
                nestedFrames.push([newSubFrame]);
            }
            frame.fields = [
                ...frame.fields,
                {
                    name: "nested",
                    type: FieldType.nestedFrames,
                    values: nestedFrames,
                    config: {}
                }
            ];
            newFrames.push(frame);
        } else if (refId === "A") {
            newFrames.push(frame);
        }
    }
    if (newFrames.length !== 2) {
        // frames do not yet include nested frames
        // return empty
        return [];
    }
    console.log("new frames: ", newFrames);
    return newFrames;
}

function transformMetricCell(frames: DataFrame[], newFieldName: string, compareFieldName: string, orderBy: string[], reducerFunction: ReducerFunctions, poolName: string): Field {
    // sort the frame and extract the fields

    const sortedFields = frames.map((frame) => {
        return frame.fields.find((f) => f.name === compareFieldName && f.labels?.nodepool === poolName);
    }).sort((a, b) => {
        const aValueIndex = orderBy.indexOf(a?.labels?.node ?? "");
        const bValueIndex = orderBy.indexOf(b?.labels?.node ?? "");
        
        return aValueIndex - bValueIndex;
    });
    // get the stats:
    const reducedValues = sortedFields.map((field) => {
        return getReducerValueFor(reducerFunction, field?.values ?? []);
    });
    const newField = {
        name: newFieldName,
        values: reducedValues,
        config: {
            custom: {
                cellOptions: {
                    mode: BarGaugeDisplayMode.Gradient,
                    type: TableCellDisplayMode.Gauge,
                    valueDisplayMode: BarGaugeValueMode.Color
                },
                align: "left"
            },
            thresholds: getThresholdsConfig(ThresholdsMode.Absolute, { 0: "orange", 60: "green", 91: "red" }),
            min: 0,
            max: 100,
            noValue: "--"
        },
        type: FieldType.number
    }
    return newField;
}
