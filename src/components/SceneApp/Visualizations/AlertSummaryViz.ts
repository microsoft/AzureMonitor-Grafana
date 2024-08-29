import { ValueMapping } from "@grafana/data";
import { PanelBuilders } from "@grafana/scenes";
import { BarGaugeDisplayMode, BarGaugeValueMode, BigValueColorMode, BigValueTextMode, MappingType, TableCellBackgroundDisplayMode, TableCellDisplayMode, TableCellOptions } from "@grafana/schema";
import { SUBSCRIPTION_VARIABLE } from "../../../constants";


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
        b.matchFieldsByQuery("A").overrideLinks([
            {
                title: "View alert in Azure Portal",
                targetBlank: true,
                url: `https://ms.portal.azure.com/#blade/Microsoft_Azure_Monitoring/AlertDetailsTemplateBlade/alertId/%2Fsubscriptions%2F\${${SUBSCRIPTION_VARIABLE}:value}%2Fresourcegroups%2F\${__data.fields["Resource Group"]}%2Fproviders%2FMicrosoft.AlertsManagement%2Falerts%2F\${__data.fields["Alert ID"]}`
            }
        ]);
    });
    tableViz.setNoValue(`No fired alerts found`);

    return tableViz;
}

export function getStatViz(title: string, noValue: string, color: string, refId: string) {
    const statViz = PanelBuilders.stat().setTitle(title);
    statViz.setNoValue(noValue);
    statViz.setColor({ mode: "fixed", fixedColor: color });
    statViz.setOption('colorMode', BigValueColorMode.Background);
    statViz.setOption('textMode', BigValueTextMode.Value);
    statViz.setOverrides((b) => {
        b.matchFieldsByQuery(refId).overrideLinks([]);
    });
    return statViz;
}
