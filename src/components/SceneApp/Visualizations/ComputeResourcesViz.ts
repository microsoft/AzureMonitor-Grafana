import { PanelBuilders } from "@grafana/scenes";
import { FieldColorModeId, StackingMode, VisibilityMode } from "@grafana/schema";
import { CLUSTER_VARIABLE, NS_VARIABLE, POD_VAR, SUBSCRIPTION_VARIABLE, WORKLOAD_VAR } from "../../../constants";
import { applyOverrideForTableViz } from "./utils";
import { getDataLink } from "../Queries/dataUtil";

export function getTableVisualizationCPUQuota() {
    const tableViz = PanelBuilders.table().setTitle("CPU Quota");
    applyOverrideForTableViz(tableViz, {
        displayName: "CPU Usage",
        fieldName: "Value #A",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "CPU Requests",
        fieldName: "Value #B",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "CPU Requests %",
        fieldName: "Value #C",
        unit: "percentunit",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "CPU Limits",
        fieldName: "Value #D",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "CPU Limits %",
        fieldName: "Value #E",
        unit: "percentunit",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "pod",
        dataLinks: [
            {
                title: "Drilldown to Logs",
                url: getDataLink("workload/computeresources/pods/logs/drilldown", `var-${POD_VAR}=\${__data.fields.pod}&\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}&\${${NS_VARIABLE}:queryparam}&\${${WORKLOAD_VAR}:queryparam}`)
            }
        ]
    });

    return tableViz;
}

export function getTableVisualizationMemoryQuota() {
    const tableViz = PanelBuilders.table().setTitle("Memory Quota");
    applyOverrideForTableViz(tableViz, {
        displayName: "Memory Usage",
        fieldName: "Value #A",
        unit: "bytes",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "Memory Requests",
        fieldName: "Value #B",
        unit: "bytes",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "Memory Requests %",
        fieldName: "Value #C",
        unit: "percentunit",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "Memory Limits",
        fieldName: "Value #D",
        unit: "bytes",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "Memory Limits %",
        fieldName: "Value #E",
        unit: "percentunit",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        displayName: "Pod",
        fieldName: "pod",
        unit: "short",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "pod",
        dataLinks: [
            {
                title: "Drilldown to Logs",
                url: getDataLink("workload/computeresources/pods/logs/drilldown", `var-${POD_VAR}=\${__data.fields.pod}&\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}&\${${NS_VARIABLE}:queryparam}&\${${WORKLOAD_VAR}:queryparam}`)
            }
        ]
    });

    return tableViz;
}

export function getTableVisualizationNetworkUsage() {
    const tableViz = PanelBuilders.table().setTitle("Current Network Usage");
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #A",
        displayName: "Current Receive Bandwidth",
        unit: "Bps",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #B",
        displayName: "Current Transmit Bandwidth",
        unit: "Bps",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #C",
        displayName: "Rate of Received Packets",
        unit: "pps",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #D",
        displayName: "Rate of Transmitted Packets",
        unit: "pps",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #E",
        displayName: "Rate of Received Packets Dropped",
        unit: "pps",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "Value #F",
        displayName: "Rate of Transmitted Packets Dropped",
        unit: "pps",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "pod",
        dataLinks: [
            {
                title: "Drilldown to Logs",
                url: getDataLink("workload/computeresources/pods/logs/drilldown", `var-${POD_VAR}=\${__data.fields.pod}&\${${SUBSCRIPTION_VARIABLE}:queryparam}&\${${CLUSTER_VARIABLE}:queryparam}&\${${NS_VARIABLE}:queryparam}&\${${WORKLOAD_VAR}:queryparam}`)
            }
        ]
    });

    return tableViz;

}

export function getTimeSeriesVisualization() {
    const timeSeriesViz = PanelBuilders.timeseries();

    timeSeriesViz
    .setCustomFieldConfig('stacking', {mode: StackingMode.Normal})
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('showPoints', VisibilityMode.Never)
    .setMin(0)
    .setColor({mode: FieldColorModeId.PaletteClassic});

    return timeSeriesViz;
}
