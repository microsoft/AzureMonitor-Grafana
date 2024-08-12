import { DataLink, FieldColor } from "@grafana/data";

export interface PanelVizOptions {
    [key: string]: any;
}

export interface GrafanaOverrides {
    fieldName: string;
    displayName?: string;
    unit?: string;
    decimals?: number;
    dataLinks?: DataLink[];
    color?: FieldColor;
}
