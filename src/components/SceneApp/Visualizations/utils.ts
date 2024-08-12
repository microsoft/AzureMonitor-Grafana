
import { VizPanelBuilder } from "@grafana/scenes";
import { GrafanaOverrides } from "./types";
import { Options as TableOptions} from "@grafana/schema/dist/esm/raw/composable/table/panelcfg/x/TablePanelCfg_types.gen";
import { TableFieldOptions, ThresholdsMode } from "@grafana/schema";
import { FieldColor, Threshold, ThresholdsConfig } from "@grafana/data";

export function applyOverrideForTableViz(viz: VizPanelBuilder<TableOptions, TableFieldOptions>, overrides: GrafanaOverrides) {
    viz.setOverrides((b) => {
        b.matchFieldsWithName(overrides.fieldName)
        .overrideUnit(overrides.unit)
        .overrideDecimals(overrides.decimals);

        if (!!overrides.displayName) {
            b.overrideDisplayName(overrides.displayName)
        }

        if (!!overrides.dataLinks) {
            b.overrideLinks(overrides.dataLinks);
        }
    });
}

export function getColorFieldConfig(mode: string, fixedColor?: string): FieldColor {
    return {
        mode: mode,
        fixedColor: fixedColor
    }
}

export function getThresholdsConfig(mode: ThresholdsMode, stepsRecord: Record<number, string>): ThresholdsConfig {
    const steps: Threshold[] = Object.entries(stepsRecord).map(([value, color]) => {
        return {
            value: Number(value),
            color: color
        }
    }) ?? [];

    return {
        mode: mode,
        steps: steps
    }
}
export function applyOverrideForTimeSeriesViz(viz: VizPanelBuilder<any, any>, overrides: GrafanaOverrides) {
    viz.setOverrides((b) => {
        b.matchFieldsWithName(overrides.fieldName)
        .overrideColor(overrides.color);
    })
}
