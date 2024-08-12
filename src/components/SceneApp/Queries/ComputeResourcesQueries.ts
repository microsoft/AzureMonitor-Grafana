import { getPrometheusQuery } from "./queryUtil";
import { SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE, WORKLOAD_VAR } from "../../../constants";


export function GetCPUUsageSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueyrRaw = `sum(\n    node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`

    return [getPrometheusQuery(promQueyrRaw, 'A', 'time_series', promDS, "{{pod}}", 2, 10)];
}

export function GetCPUQuotaSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueriesRaw = [
        `sum(\n    node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"cpu\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n/sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"cpu\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"cpu\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n/sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"cpu\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`
    ];
    const promQueries = [];
    const promQueryFormat = "table";
    let idx = 'A'.charCodeAt(0);
    for (const query of promQueriesRaw) {
        promQueries.push(getPrometheusQuery(query, String.fromCharCode(idx), promQueryFormat, promDS, "", 2, 10, true));
        idx++;
    }
    return promQueries;
}

export function GetMemoryUsageSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueyrRaw = `sum(\n    container_memory_working_set_bytes{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", container!=\"\", image!=\"\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`;
    return [getPrometheusQuery(promQueyrRaw, 'A', 'time_series', promDS, "{{pod}}", 2, 10)];

}

export function GetMemoryQuotaPromSceneQueries() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueriesRaw = [
        `sum(\n    container_memory_working_set_bytes{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", container!=\"\", image!=\"\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"memory\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    container_memory_working_set_bytes{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", container!=\"\", image!=\"\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n/sum(\n    kube_pod_container_resource_requests{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"memory\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"memory\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`,
        `sum(\n    container_memory_working_set_bytes{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", container!=\"\", image!=\"\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n/sum(\n    kube_pod_container_resource_limits{job=\"kube-state-metrics\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", resource=\"memory\"}\n  * on(namespace,pod)\n    group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}\n) by (pod)\n`
    ];

    const promQueries = [];
    const promQueryFormat = "table";
    let idx = 'A'.charCodeAt(0);
    for (const query of promQueriesRaw) {
        promQueries.push(getPrometheusQuery(query, String.fromCharCode(idx), promQueryFormat, promDS, "", 2, 10, true));
        idx++;
    }
    return promQueries;
}

export function GetNetworkUsageSceneQueries() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueriesRaw = [
        `(sum(irate(container_network_receive_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`,
        `(sum(irate(container_network_transmit_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`,
        `(sum(irate(container_network_receive_packets_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`,
        `(sum(irate(container_network_transmit_packets_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`,
        `(sum(irate(container_network_receive_packets_dropped_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`,
        `(sum(irate(container_network_transmit_packets_dropped_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`
    ];

    const promQueries = [];
    const promQueryFormat = "table";
    let idx = 'A'.charCodeAt(0);
    for (const query of promQueriesRaw) {
        promQueries.push(getPrometheusQuery(query, String.fromCharCode(idx), promQueryFormat, promDS, "", 2, 10, true));
        idx++;
    }
    return promQueries;
}

export function GetReceiveBandwidthSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_receive_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;

    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetTransmitBandwidthSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_transmit_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetAvgContainerBandwithReceivedSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(avg(irate(container_network_receive_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetAvgContainerBandwithTransmittedSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(avg(irate(container_network_transmit_bytes_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetRateofReceivedPacketsSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_receive_packets_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetRateofTransmittedPacketsSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_transmit_packets_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetRateofReceivedPacketsDroppedSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_receive_packets_dropped_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function GetRateofTransmittedPacketsDroppedSceneQuery() {
    const promDS = { type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}` };
    const promQueryRaw = `(sum(irate(container_network_transmit_packets_dropped_total{job=\"cadvisor\", cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"}[$__rate_interval])\n* on (namespace,pod)\ngroup_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\", workload=~\"\${${WORKLOAD_VAR}}\", workload_type=\"\${type}\"}) by (pod))\n`;
    const promQueryFormat = `time_series`;
    return [getPrometheusQuery(promQueryRaw, 'A', promQueryFormat, promDS, "{{pod}}", 2, 10)];
}

export function TransformData(data: SceneQueryRunner) {
    const transformedata = new SceneDataTransformer({
        $data: data,
        transformations: [
            {
                id: "merge",
                options: {
                  reducers: []
                }
            },
            {
                id: "organize",
                options: {
                  excludeByName: {
                    Time: true
                  },
                  indexByName: {},
                  renameByName: {}
                }
            }
        ]
    });

    return transformedata;
}
