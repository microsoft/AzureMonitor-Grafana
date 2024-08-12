import { ValueMapping } from "@grafana/data";
import { PanelBuilders } from "@grafana/scenes";
import { BarGaugeDisplayMode, BarGaugeValueMode, BigValueColorMode, BigValueTextMode, MappingType, TableCellBackgroundDisplayMode, TableCellDisplayMode, TableCellOptions } from "@grafana/schema";



export function getTableVisualizationAlertSummaryDetails() {
    const tableViz = PanelBuilders.table();
    const valueMappingsSev: ValueMapping[] = [
        {
            options: {
                "Sev0": {
                    "color": "semi-dark-red",
                    "text": "Critical"
                },
                "Sev1": {
                    "color": "semi-dark-orange",
                    "text": "Error"
                },
                "Sev2": {
                    "color": "semi-dark-yellow",
                    "text": "Warning"
                },
                "Sev3": {
                    "color": "semi-dark-blue",
                    "text": "Informational"
                },
                "Sev4": {
                    "color": "semi-dark-purple",
                    "text": "Verbose"
                },
        },
            type: MappingType.ValueToText,
        }
    ];
    const valueMappingsAC: ValueMapping[] = [
        {
            options: {
                "Resolved": {
                    "color": "semi-dark-green",
                },
                "Fired": {
                    "color": "semi-dark-orange",
                },
            },
            type: MappingType.ValueToText,
        }
    ];
    const tableCellOptionsGauge: TableCellOptions =  {
        mode: BarGaugeDisplayMode.Basic,
        type: TableCellDisplayMode.Gauge,
        valueDisplayMode: BarGaugeValueMode.Color
    };
    const tableCellOptionsBackground: TableCellOptions =  {
        mode: TableCellBackgroundDisplayMode.Basic,
        type: TableCellDisplayMode.ColorBackground,
    };
    tableViz.setOverrides((b) => {
        b.matchFieldsWithName("Severity").overrideMappings(valueMappingsSev).overrideCustomFieldConfig('cellOptions', tableCellOptionsBackground );
        b.matchFieldsWithName("Alert Condition").overrideMappings(valueMappingsAC).overrideCustomFieldConfig('cellOptions', tableCellOptionsGauge );
    });
    tableViz.setNoValue(`No fired alerts found`)

    return tableViz;
}

export function getStatTotalAlerts() {
    const statViz = PanelBuilders.stat().setTitle('Total Alerts');
    statViz.setNoValue(`No fired alerts found`);
    statViz.setColor({ mode: "fixed", fixedColor: "semi-dark-red" });
    statViz.setOption('colorMode', BigValueColorMode.Background);
    statViz.setOption('textMode', BigValueTextMode.Value);
    
    return statViz;
}

export function getStatPromAlerts() {
    const statViz = PanelBuilders.stat().setTitle('Prometheus');
    statViz.setNoValue(`No fired Prom alerts found`);
    statViz.setOption('textMode', BigValueTextMode.Value);
    statViz.setOption('colorMode', BigValueColorMode.Background);
    statViz.setColor({ mode: "fixed", fixedColor: "semi-dark-green" });
    return statViz;
} 

export function getStatPlatformAlerts() {
    const statViz = PanelBuilders.stat().setTitle('Platform');
    statViz.setNoValue(`No fired Platform alerts found`);
    statViz.setOption('textMode', BigValueTextMode.Value);
    statViz.setOption('colorMode', BigValueColorMode.Background);
    statViz.setColor({ mode: "fixed", fixedColor: "semi-dark-orange" });
    return statViz;
}
