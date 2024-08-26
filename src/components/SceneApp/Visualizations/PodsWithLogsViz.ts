import { PanelBuilders, VizPanelBuilder } from "@grafana/scenes";
import { applyOverrideForTableViz, applyOverrideForTimeSeriesViz, getColorFieldConfig } from "./utils";
import {  FieldColorModeId, GraphThresholdsStyleMode, StackingMode, VisibilityMode } from "@grafana/schema";
import { ThresholdsConfig } from "@grafana/data";

export function applyOverridesCPUUsage(timeSeriesViz: VizPanelBuilder<any, any>) {
    applyOverrideForTimeSeriesViz(timeSeriesViz, {
        fieldName: "requests",
        color: getColorFieldConfig("fixed", "red" )
    });

    applyOverrideForTimeSeriesViz(timeSeriesViz, {
        fieldName: "limits",
        color: getColorFieldConfig("fixed", "orange" )
    });
}

export function getTimeSeriesViz(title: string, fillOpacity: number, lineWidth: number, unit: string, max: number | undefined, thresholds: ThresholdsConfig | undefined, thresholdsStyle: GraphThresholdsStyleMode | undefined) {
    const timeSeriesViz = PanelBuilders.timeseries().setTitle(title);

    timeSeriesViz
    .setCustomFieldConfig("fillOpacity", fillOpacity)
    .setCustomFieldConfig("lineWidth", lineWidth)
    .setCustomFieldConfig("showPoints", VisibilityMode.Never)
    .setCustomFieldConfig("stacking", { mode: StackingMode.Normal })
    .setUnit(unit)
    .setMin(0)
    .setNoValue("0")
    .setColor(getColorFieldConfig(FieldColorModeId.PaletteClassic));
    
    if (!!max) {
        timeSeriesViz.setMax(1);
    }
    
    if (!!thresholds) {
        timeSeriesViz.setThresholds(thresholds);
    }
    
    if (!!thresholdsStyle) {
        timeSeriesViz.setCustomFieldConfig("thresholdsStyle", { mode: GraphThresholdsStyleMode.LineAndArea });
        
    }
    return timeSeriesViz;
}


export function getTableVizCPUQuota() {
    const tableViz = PanelBuilders.table().setTitle("CPU Quota");
    applyOverrideForTableViz(tableViz, {
        fieldName: "CPU Usage",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "CPU Requests",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "CPU Requests %",
        unit: "percentunit",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "CPU Limits",
        unit: "short",
        decimals: 2
    });
    applyOverrideForTableViz(tableViz, {
        fieldName: "CPU Limits %",
        unit: "percentunit",
        decimals: 2
    });

    return tableViz;
}

export function getTableVizMemoryQuota() {
    const tableViz = PanelBuilders.table().setTitle("Memory Quota");

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Usage (WSS)",
        unit: "bytes",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Requests",
        unit: "bytes",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Requests %",
        unit: "percentunit",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Limits",
        unit: "bytes",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Limits %",
        unit: "percentunit",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Usage (RSS)",
        unit: "bytes",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Usage (Cache)",
        unit: "bytes",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Memory Usage (Swap)",
        unit: "bytes",
        decimals: 2
    });

    return tableViz;
}

export function getTableVizCurrentStorage() {
    const tableViz = PanelBuilders.table().setTitle("Current Storage IO");

    applyOverrideForTableViz(tableViz, {
        fieldName: "IOPS(Reads)",
        unit: "short",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "IOPS(Writes)",
        unit: "short",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "IOPS(Reads + Writes)",
        unit: "short",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Throughput(Read)",
        unit: "bps",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Throughput(Write)",
        unit: "bps",
        decimals: 2
    });

    applyOverrideForTableViz(tableViz, {
        fieldName: "Throughput(Read + Write)",
        unit: "bps",
        decimals: 2
    });

    return tableViz; 
}
