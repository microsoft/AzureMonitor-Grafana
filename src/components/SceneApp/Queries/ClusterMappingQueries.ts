import { DataFrame, DataFrameWithValue, Field, FieldType } from "@grafana/data";
import { CustomTransformOperator, SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { TableCellDisplayMode, TableCustomCellOptions, TableFieldOptions } from "@grafana/ui";
import { AksIcon } from "components/img/AKSIcon";
import { Observable, map } from "rxjs";
import { ClusterMapping } from "types";
import { AGG_VAR, AZMON_DS_VARIABLE, CLUSTER_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE, VAR_ALL } from "../../../constants";
import CellWithIcon from "../CustomComponents/cellWithIcon";
import { getColorFieldConfig } from "../Visualizations/utils";
import { castFieldNameToAgg, formatReadyTotal, getDataLink, getReducerValueFor, interpolateVariables } from "./dataUtil";
import { azure_monitor_queries } from "./queries";
import { getAMWToGrana, getAzureResourceGraphQuery, getLogAnalyticsQuery, getPrometheusQuery } from "./queryUtil";

export function GetClustersQuery(query: string): SceneQueryRunner {
    const azMonQuery = {
        datasource: {
            type: 'datasource',
            uid: '-- Mixed --',
        },
        queries: [
            getAzureResourceGraphQuery(query, `\$${SUBSCRIPTION_VARIABLE}`, "clusters"),
            getAzureResourceGraphQuery(azure_monitor_queries["workspaceNameQuery"], `\$${SUBSCRIPTION_VARIABLE}`, "workspaces"),
        ]
    }
    return new SceneQueryRunner(azMonQuery);
}

export function TransformData(data: SceneQueryRunner, clustersData: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            transformTrendData(clustersData)
        ]
    });
    return transformedData;
}

export function GetClusterStatsQueries(clusterMappings: Record<string, ClusterMapping>) {
    const queries = [];
    let idx = 'A'.charCodeAt(0);
    for (const cluster in clusterMappings) {
        const clusterID = clusterMappings[cluster].clusterId;
        const promDS = clusterMappings[cluster].promDs;
        // const memUtilRaw = `let trendBinSize = 5m;\r\nlet clusterName = '${cluster}';\r\nlet capacityCounterName = 'memoryCapacityBytes';\r\nlet usageCounterName = 'memoryRssBytes';\r\nlet perf = Perf\r\n    | where $__timeFilter(TimeGenerated)\r\n    | where _ResourceId contains '${cluster}'\r\n    | where ObjectName == 'K8SNode'\r\n    | where CounterName in (capacityCounterName, usageCounterName)\r\n    | extend TimeGenerated = bin(TimeGenerated, 1m) \r\n    | project TimeGenerated, Computer, CounterName, CounterValue;\r\nlet perfCapacity = perf \r\n    | where CounterName == capacityCounterName\r\n    | project TimeGenerated, Computer, Capacity=CounterValue;\r\nlet perfUsage = perf\r\n    | where CounterName == usageCounterName\r\n    | project TimeGenerated, Computer, Usage=CounterValue;\r\nlet perfUsagePercent = perfCapacity\r\n    | join kind=inner perfUsage on Computer, TimeGenerated\r\n    | extend UsagePercent = Usage * 100.0 / Capacity\r\n    | project-away *1, Capacity, Usage;\r\nlet computers = KubeNodeInventory\r\n    | where $__timeFilter( TimeGenerated)\r\n    | where ClusterId contains '${cluster}'\r\n    | distinct Computer;\r\nlet perfFilteredData = perfUsagePercent\r\n    | where Computer in (computers);\r\nlet computerHasPerfData = toscalar(perfFilteredData\r\n    | summarize count() > 0);\r\nperfFilteredData\r\n    | summarize\r\n        \${${AGG_VAR}} = \$${AGG_VAR}(UsagePercent)\r\n        by bin(TimeGenerated, trendBinSize), Cluster = tolower(clusterName)\r\n    | order by TimeGenerated asc\r\n`;
        const cpuUtilRaw = `1 - \$${AGG_VAR}(rate(node_cpu_seconds_total{mode="idle", cluster="${cluster}"}[$__rate_interval]))`;
        const memUtilRaw = `1 - sum( sum(
                        node_memory_MemAvailable_bytes{cluster="${cluster}"} or
                        (
                          node_memory_Buffers_bytes{cluster="${cluster}"} +
                          node_memory_Cached_bytes{cluster="${cluster}"} +
                          node_memory_MemFree_bytes{cluster="${cluster}"} +
                          node_memory_Slab_bytes{cluster="${cluster}"}
                        )
                      ) by (cluster)) / sum(node_memory_MemTotal_bytes{cluster="${cluster}"})`
        const podReadyCount = `let trendBinSize = 5m;\r\nlet maxListSize = 1000;\r\nlet clusterId = '${clusterID}';     \r\nlet rawData =     KubeNodeInventory     \r\n     | where $__timeFilter( TimeGenerated)    \r\n     | where $__timeFilter( TimeGenerated)    \r\n     | where ClusterId =~ clusterId          \r\n     | distinct ClusterId, TimeGenerated     \r\n     | summarize ClusterSnapshotCount = count() by Timestamp = bin(TimeGenerated, trendBinSize), ClusterId     \r\n     | join hint.strategy=broadcast (         KubeNodeInventory         \r\n     | where $__timeFilter( TimeGenerated)        \r\n     | where $__timeFilter( TimeGenerated)                 \r\n     | where ClusterId =~ clusterId                  \r\n     | summarize TotalCount = count(), ReadyCount = sumif(1, Status contains ('Ready'))                  by ClusterId, Timestamp = bin(TimeGenerated, trendBinSize)         \r\n     | extend NotReadyCount = TotalCount - ReadyCount     ) on ClusterId, Timestamp     \r\n     | project ClusterId, Timestamp,               TotalCount = todouble(TotalCount) / ClusterSnapshotCount,               ReadyCount = todouble(ReadyCount) / ClusterSnapshotCount,               NotReadyCount = todouble(NotReadyCount) / ClusterSnapshotCount;     rawData     \r\n     | order by Timestamp asc     \r\n     | summarize makelist(Timestamp, maxListSize),                 makelist(TotalCount, maxListSize),                 makelist(ReadyCount, maxListSize),                 makelist(NotReadyCount, maxListSize)             by ClusterId     \r\n     | join (         rawData         \r\n     | summarize Avg_TotalCount = avg(TotalCount), Avg_ReadyCount = avg(ReadyCount), Avg_NotReadyCount = avg(NotReadyCount) by ClusterId     ) on ClusterId  \r\n    | project ClusterId, Avg_ReadyCount, Avg_TotalCount`;
        const law = clusterMappings[cluster].law;
        if (!!law) {
            queries.push(getLogAnalyticsQuery(podReadyCount, law, `${cluster}_NODES_READY_${String.fromCharCode(idx)}`, false, "time_series"));
            idx++;
        }
        if (promDS?.type && promDS.uid) {
            queries.push(getPrometheusQuery(cpuUtilRaw, `${cluster}_CPUUtil_${String.fromCharCode(idx)}`, "time_series", promDS, undefined, 2, undefined, false));
            idx++;
            queries.push(getPrometheusQuery(memUtilRaw, `${cluster}_MemUtil_${String.fromCharCode(idx)}`, "time_series", promDS, "", 2, undefined, false));
            idx++;
        }
    }
    return queries;
}

const transformTrendData: (clusterData: SceneQueryRunner) => CustomTransformOperator = 
    (clusterData: SceneQueryRunner) => 
    () =>
    (source: Observable<DataFrame[]>) => {
        return source.pipe(
            map(dataFrames => TransformStatsData(dataFrames, clusterData))
        );
}

export const GetClusterToSubscription = (clusterData: SceneQueryRunner) => {
    const clusters = clusterData.state.data?.series.find((s) => s.refId === "clusters")?.fields[0]?.values ?? [];
    const subscriptionIds = clusterData.state.data?.series.find((s) => s.refId === "clusters")?.fields.find((f) => f.name === "subscriptionId")?.values ?? [];
    const clusterToSubscription = new Map<string, string>();
    for (const cluster of clusters) {
        clusterToSubscription.set(cluster, subscriptionIds[clusters.indexOf(cluster)]);
    }
    return clusterToSubscription;
}

function TransformStatsData(data: DataFrame[], clusterData: SceneQueryRunner): DataFrame[] {
    const clusters = clusterData.state.data?.series.find((s) => s.refId === "clusters")?.fields[0]?.values ?? [];
    const workspaces = clusterData.state.data?.series.find((s) => s.refId === "workspaces");
    const clusterToSubscription = GetClusterToSubscription(clusterData);
    const filteredClusters = clusters.map((cluster) => {
        const [amw, _] = getAMWToGrana(workspaces?.fields[0].values ?? [], workspaces?.fields[1].values ?? [], cluster);

        return !!amw ? cluster : `${cluster}_unmonitored`;
    }).sort((a, b) => {
        const aIsUnmonitored = a.endsWith('_unmonitored');
        const bIsUnmonitored = b.endsWith('_unmonitored');

        return aIsUnmonitored - bIsUnmonitored;
    });
    const newFrame: DataFrame[] = [];
    // prepare columns
    const clusterField: Field<string> = {
        name: "Cluster",
        type: FieldType.string,
        config : {
            custom: getClustersCustomFieldConfig(clusterToSubscription),
        },
        values: []
    };

    const cpuUtilTrend: Field<DataFrame> = {
        name: "CPU Utilization",
        type: FieldType.frame,
        config: {
            color: getColorFieldConfig("fixed", "blue"),
            noValue: "--"
        },
        values: []
    };

    const memUtilTrend: Field<DataFrame> = {
        name: "Memory Utilization",
        type: FieldType.frame,
        config: {
            color: getColorFieldConfig("fixed", "blue")
        },
        values: []
    };


    const nodesReady: Field<string | undefined> = {
        name: "Nodes Ready",
        type: FieldType.string,
        config : {
            custom: getNodesReadyFieldConfig()
        },
        values: []
    };

    const emptyFrame: DataFrameWithValue = {
        fields: [
            {
                name: "time",
                type: FieldType.time,
                config: {},
                values: []
            },
            {
                name: "value",
                type: FieldType.number,
                config: {},
                values: []
            }
        ],
        value: null,
        length: 2,
        refId: "empty"
    }
    for (const cluster of filteredClusters) {
        // add cluster to cluster field
        clusterField.values.push(cluster);
        // fetch avg and max trend
        const cPUUtilFrame: DataFrame | undefined = data.find((x) => x.refId?.includes( `${cluster}_CPUUtil`)) ;
        const memUtilFrame: DataFrame | undefined = data.find((x) => x.refId?.includes( `${cluster}_MemUtil`)) ;
        // const memUtilMaxFrame: DataFrame | undefined = data.find((x) => x.refId?.includes( `${cluster}_MAX_MemUtil`)) ;
        const nodesReadyFrame: DataFrame | undefined = data.find((x) => x.refId?.includes( `${cluster}_NODES_READY`)) ;
        if (!!cPUUtilFrame && cPUUtilFrame.fields.length > 0) {
            const statField = cPUUtilFrame.fields.find((f) => f.type === FieldType.number);
            const stat = getReducerValueFor(castFieldNameToAgg(statField?.name ?? ""), statField?.values ?? []);
            const newFrame: DataFrameWithValue = {
                ...cPUUtilFrame,
                value: stat ? stat * 100 : null
            };
            cpuUtilTrend.values.push(newFrame);
        } else {
            cpuUtilTrend.values.push(emptyFrame);
        }

        if (!!memUtilFrame && memUtilFrame.fields.length > 0) {
            const statField = memUtilFrame.fields.find((f) => f.type === FieldType.number);
            const stat = getReducerValueFor(castFieldNameToAgg(statField?.name ?? ""), statField?.values ?? []);
            const newFrame: DataFrameWithValue = {
                ...memUtilFrame,
                value: stat ? stat * 100 : null
            };
            memUtilTrend.values.push(newFrame);
        } else {
            memUtilTrend.values.push(emptyFrame);
        }

        if (!!nodesReadyFrame) {
            const readyField = nodesReadyFrame.fields.find((f) => f.name === "Avg_ReadyCount");
            const totalField = nodesReadyFrame.fields.find((f) => f.name === "Avg_TotalCount");
            const readyValues = readyField?.values ?? [];
            const totalValues = totalField?.values ?? [];
            for (let i = 0; i < readyValues.length; i++) {
                nodesReady.values.push(formatReadyTotal(readyValues[i], totalValues[i]));
            }
        } else {
            nodesReady.values.push(undefined);
        }
    }
    //clusterField.config.custom = clusterToSubscription;
    const tableFrame: DataFrame = {
        fields: [clusterField, cpuUtilTrend, memUtilTrend, nodesReady],
        length: filteredClusters.length,
        refId: "clusterStats"
    }

    newFrame.push(tableFrame);
    return newFrame;
}


function getNodesReadyFieldConfig() {
    const nodesReadyOptions: TableCustomCellOptions = {
        type: TableCellDisplayMode.Custom,
        cellComponent: (props) => {
            const valueString = props.value as string;
            const values = valueString?.split("/").map((v: string) => parseInt(v, 10));
            if (!!values && values.length === 2) {
                const iconName = values[0] === values[1] ? "check-circle" : "exclamation-circle";
                const color = values[0] === values[1] ? "green" : "red";
                return CellWithIcon({ iconName, color, cellValue: valueString, type: "grafana-builtin" });
            } else {
                return CellWithIcon({ cellValue: "--", type: "none" });
            }
        }
    };

    const nodesReadyFieldConfig: TableFieldOptions = {
        align: "auto",
        cellOptions: nodesReadyOptions,
        inspect: false
    };
    return nodesReadyFieldConfig;
}

function getClustersCustomFieldConfig(clusterToSubscription: Map<string, string>) {
    const clusterOptions: TableCustomCellOptions = {
        type: TableCellDisplayMode.Custom,
        cellComponent: (props) => {
            const cellValue = (props.value as string);
            const subscriptionId = clusterToSubscription.get(cellValue) ?? VAR_ALL;
            const isUnmonitored = cellValue.endsWith("_unmonitored") ?? false;
            const newCellValue = isUnmonitored ? `${cellValue.substring(0, cellValue.length - 12)} (Unmonitored)` : cellValue;
            const aksIcon = AksIcon({ greyOut: isUnmonitored });
            const interpolatedLink = interpolateVariables(getDataLink(ROUTES.Namespaces, `var-${CLUSTER_VARIABLE}=${newCellValue}&var-${SUBSCRIPTION_VARIABLE}=${subscriptionId}&\${${AZMON_DS_VARIABLE}:queryparam}`));
            const link = isUnmonitored ? undefined : interpolatedLink;

            return CellWithIcon({ cellValue: newCellValue, type: "custom", customIcon: aksIcon, link });
        }
    };

    const custerFieldConfig: TableFieldOptions = {
        align: "auto",
        cellOptions: clusterOptions,
        inspect: false,
        minWidth: 375
    };

    return custerFieldConfig;
}
