import { ClusterMapping } from "types";
import { getLogAnalyticsQuery, getPrometheusQuery } from "./queryUtil";
import { SyslogSeverityType } from "./types";
import { DataSourceRef } from "@grafana/schema";
import { SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { PROM_DS_VARIABLE, POD_VAR, CLUSTER_VARIABLE, NS_VARIABLE } from "../../../constants";

const promDs: DataSourceRef = {
    type: "prometheus",
    uid: `\${${PROM_DS_VARIABLE}}`
};

function getQueryRawFor(name: string, clusterID: string, severityLevel: SyslogSeverityType | undefined) {
    switch(name) {
        case "KubeWarningEvents":
            return `KubeEvents
            | where $__timeFilter(TimeGenerated)
            | where ClusterId =~ '${clusterID}'
            | where ObjectKind =~ 'Pod'
            | where Name =~ '\$${POD_VAR}'
            | summarize count()`
        case "SysLog": 
            return `Syslog 
            | where $__timeFilter(TimeGenerated)
            | where SeverityLevel == "${severityLevel}"
            | summarize count()`
        case "KubeEventsPods":
            return `KubeEvents
            | where $__timeFilter(TimeGenerated)
            | where ClusterId =~ '${clusterID}'
            | where ObjectKind =~ 'Pod'
            | where Name =~ '\$${POD_VAR}'
            | extend message = strcat("[", KubeEventType, "]   ", Message)
            | project TimeGenerated, message, level = KubeEventType, Reason, Name, Namespace
            | order by TimeGenerated desc`
        case "ContainerLogs":
            return `ContainerLogV2\r\n| where $__timeFilter(TimeGenerated)\r\n| where _ResourceId =~ '${clusterID}'\r\n| where PodName =~ '\$${POD_VAR}'\r\n| project TimeGenerated, LogMessage, LogSource\r\n| order by TimeGenerated desc`
        default:
            return "";
    }
}
export function GetLASceneQueryFor(name: string, selectedCluster: string, clusterMappings: Record<string, ClusterMapping>, laFormat: string, severityLevel: SyslogSeverityType | undefined) {
    const law = clusterMappings[selectedCluster]?.law;
    const clusterID = clusterMappings[selectedCluster]?.clusterId ?? "";

    if (!!law) {
        const lawQueryRaw = getQueryRawFor(name, clusterID, severityLevel);
        return getLogAnalyticsQuery(lawQueryRaw, law, `${name}${severityLevel}`, false, laFormat);
    }

    return undefined;
}

export function GetCPUUsageQuery() {
    const promQueriesRaw = [
        `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", cluster=\"\${${CLUSTER_VARIABLE}}\"}) by (container)`,
        `sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", resource=\"cpu\"}\n)\n`,
        `sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\$${POD_VAR}\", resource=\"cpu\"}\n)\n`
    ];
    const queries = [];
    let idx = 'A'.charCodeAt(0);
    queries.push(getPrometheusQuery(promQueriesRaw[0], `CPUUsage${String.fromCharCode(idx)}`, "time_series",promDs, "{{container}}", 2, 10 ));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[1], `CPUUsage${String.fromCharCode(idx)}`, "time_series", promDs, "requests", 2, 10 ));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[2], `CPUUsage${String.fromCharCode(idx)}`, "time_series", promDs, "limits", 2, 10, undefined, true ));

    return queries
}

export function GetCPUThrottlingQueries(){
    const promQueryRaw = `sum(increase(container_cpu_cfs_throttled_periods_total{job=\"cadvisor\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\"}[$__rate_interval])) by (container) /sum(increase(container_cpu_cfs_periods_total{job=\"cadvisor\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\"}[$__rate_interval])) by (container)`;

    return [getPrometheusQuery(promQueryRaw, "CPUThrottling", "time_series", promDs, "{{container}}", 2, 10)];
}

export function GetCPUQuotaQueries() {
    const promQueriesRaw = [
        `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_requests{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_requests{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container) / sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`
    ];

    const queries = [];
    let idx = 'A'.charCodeAt(0);
    for (const query of promQueriesRaw) {
        queries.push(getPrometheusQuery(query, `CPUQuota${String.fromCharCode(idx)}`, "table", promDs, undefined, 2, 10, true));
        idx++;
    }

    return queries;
}

export function GetMemoryUsageQueries() {
    const promQueriesRaw = [
        `sum(container_memory_working_set_bytes{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container!=\"\", image!=\"\"}) by (container)`,
        `sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", resource=\"memory\"}\n)\n`,
        `sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", resource=\"memory\"}\n)\n`
    ];

    const queries = [];
    let idx = 'A'.charCodeAt(0);

    queries.push(getPrometheusQuery(promQueriesRaw[0], `MemoryUsage_${String.fromCharCode(idx)}`, "time_series", promDs, "{{container}}", 2, 10 ));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[1], `MemoryUsage_${String.fromCharCode(idx)}`, "time_series", promDs, "requests", 2, 10 ));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[2], `MemoryUsage_${String.fromCharCode(idx)}`, "time_series", promDs, "limits", 2, 10 ));

    return queries;
}

export function GetMemoryQuotaQueries() {
    const promQueriesRaw = [
        `sum(container_memory_working_set_bytes{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container!=\"\", image!=\"\"}) by (container)`,
        `sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_requests{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(container_memory_working_set_bytes{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", image!=\"\"}) by (container) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_requests{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(container_memory_working_set_bytes{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container!=\"\", image!=\"\"}) by (container) / sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}) by (container)`,
        `sum(container_memory_rss{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container != \"\", container != \"POD\"}) by (container)`,
        `sum(container_memory_cache{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container != \"\", container != \"POD\"}) by (container)`,
        `sum(container_memory_swap{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\", container != \"\", container != \"POD\"}) by (container)`
    ];
    const queries = [];
    let idx = 'A'.charCodeAt(0);
    for (const query of promQueriesRaw) {
        queries.push(getPrometheusQuery(query, `MemoryQuota${String.fromCharCode(idx)}`, "table", promDs, undefined, 2, 10, true));
        idx++;
    }

    return queries;
}

export function GetRateQueriesFor(metric: string, ) {
    const promQueryRaw = `sum(irate(${metric}{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval])) by (pod)`;

    return [getPrometheusQuery(promQueryRaw, "ReceiveBandwidth", "time_series", promDs, "{{pod}}", 2, 10, undefined, true)];
}

export function GetIOPSQueries() {
    const promQueriesRaw = [
        `ceil(sum by(pod) (rate(container_fs_reads_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval])))`,
        `ceil(sum by(pod) (rate(container_fs_writes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\",namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval])))`
    ];

    const queries = [];
    let idx = 'A'.charCodeAt(0);

    queries.push(getPrometheusQuery(promQueriesRaw[0], `IOPS_${String.fromCharCode(idx)}`, "time_series", promDs, "Reads", 2, 10));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[1], `IOPS_${String.fromCharCode(idx)}`, "time_series", promDs, "Writes", 2, 10));

    return queries;
}

export function GetThrouputQueries() {
    const promQueriesRaw = [
        `sum by(pod) (rate(container_fs_reads_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(pod) (rate(container_fs_writes_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`
    ];

    const queries = [];
    let idx = 'A'.charCodeAt(0);

    queries.push(getPrometheusQuery(promQueriesRaw[0], `Throughput_${String.fromCharCode(idx)}`, "time_series", promDs, "Reads", 2, 10));
    idx++;
    queries.push(getPrometheusQuery(promQueriesRaw[1], `Throughput_${String.fromCharCode(idx)}`, "time_series", promDs, "Writes", 2, 10));

    return queries;
}

export function GetIOPSRWQueries() {
    const promQueryRaw = `ceil(sum by(container) (rate(container_fs_reads_total{job=\"cadvisor\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]) + rate(container_fs_writes_total{job=\"cadvisor\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval])))`;

    return [getPrometheusQuery(promQueryRaw, "IOPSRW", "time_series", promDs, "{{container}}", 2, 10, undefined, true )];
}

export function GetThroughputQueries() {
    const promQueryRaw = `sum by(container) (rate(container_fs_reads_bytes_total{job=\"cadvisor\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]) + rate(container_fs_writes_bytes_total{job=\"cadvisor\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`;

    return [getPrometheusQuery(promQueryRaw, "ThroughputRW", "time_series", promDs, "{{container}}", 2, 10, undefined, true )];
}

export function GetCurrentStorageIOQueries() {
    const promQueriesRaw = [
        `sum by(container) (rate(container_fs_reads_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(container) (rate(container_fs_writes_total{job=\"cadvisor\",device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(container) (rate(container_fs_reads_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]) + rate(container_fs_writes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(container) (rate(container_fs_reads_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(container) (rate(container_fs_writes_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`,
        `sum by(container) (rate(container_fs_reads_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]) + rate(container_fs_writes_bytes_total{job=\"cadvisor\", device=~\"mmcblk.p.+|nvme.+|rbd.+|sd.+|vd.+|xvd.+|dm-.+|dasd.+\", container!=\"\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\$${NS_VARIABLE}\", pod=\"\${${POD_VAR}}\"}[$__rate_interval]))`
    ];

    const queries = [];
    let idx = 'A'.charCodeAt(0);

    for (const query of promQueriesRaw) {
        queries.push(getPrometheusQuery(query, `StorageIO_${String.fromCharCode(idx)}`, "table", promDs, "", 2, 10, true));
        idx++;
    }

    return queries;
}

export function TransformCPUUsageData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                id: "filterFieldsByName",
                options: {
                  include: {
                    names: [
                      "Time",
                      "requests",
                      "limits"
                    ]
                  }
                }
              }
        ],
    });

    return transformedData;
}

export function TransformCPUQuotaData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                "id": "merge",
                "options": {
                  "reducers": []
                }
            },
            {
                "id": "organize",
                "options": {
                    "excludeByName": {
                    "Time": true
                    },
                    "indexByName": {
                        container: 0
                    },
                    "renameByName": {
                        "container": "Container",
                        "Value #CPUQuotaA": "CPU Usage",
                        "Value #CPUQuotaB": "CPU Requests",
                        "Value #CPUQuotaC": "CPU Requests %",
                        "Value #CPUQuotaD": "CPU Limits",
                        "Value #CPUQuotaE": "CPU Limits %",
                    }
                }
            },
            {
                "id": "filterByValue",
                "options": {
                    "filters": [
                        {
                            "config": {
                            "id": "notEqual",
                            "options": {
                                "value": ""
                            }
                            },
                            "fieldName": "Container"
                        }
                    ],
                    "match": "all",
                    "type": "include"
                }
            }
        ]
    });

    return transformedData;
}

export function TransformMemoryQuotaData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                "id": "merge",
                "options": {}
            },
            {
                "id": "organize",
                "options": {
                    "excludeByName": {
                        "Time": true
                    },
                    "indexByName": {},
                    "renameByName": {
                        "Value #MemoryQuotaA": "Memory Usage (WSS)",
                        "Value #MemoryQuotaB": "Memory Requests",
                        "Value #MemoryQuotaC": "Memory Requests %",
                        "Value #MemoryQuotaD": "Memory Limits",
                        "Value #MemoryQuotaE": "Memory Limits %",
                        "Value #MemoryQuotaF": "Memory Usage (RSS)",
                        "Value #MemoryQuotaG": "Memory Usage (Cache)",
                        "Value #MemoryQuotaH": "Memory Usage (Swap)",
                        "container": "Container"
                    }
                }
            }
        ]
    });

    return transformedData;
}

export function TransformCurrentStorageData(data: SceneQueryRunner) {
    const transformedData = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                "id": "merge",
                "options": {}
            },
            {
                "id": "organize",
                "options": {
                    "excludeByName": {
                        "Time": true
                    },
                    "indexByName": {},
                    "renameByName": {
                        "Value #StorageIO_A": "IOPS(Reads)",
                        "Value #StorageIO_B": "IOPS(Writes)",
                        "Value #StorageIO_C": "IOPS(Reads + Writes)",
                        "Value #StorageIO_D": "Throughput(Read)",
                        "Value #StorageIO_E": "Throughput(Write)",
                        "Value #StorageIO_F": "Throughput(Read + Write)",
                        "container": "Container"
                    }
                }
            }
        ]
    });

    return transformedData;
}
