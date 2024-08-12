import { DataSourceRef } from "@grafana/schema";

type PromQueryFormatType = "table" | "time_series";
export type SyslogSeverityType = "emergency" | "alert" | "error" | "warning" | "critical";

export interface AKSFilters {
    cluster?: string;
    namespace?: string;
    workload?: string;
    workload_type?: string;
}

export interface PromQuery {
    expr: string;
    refId: string;
    format: PromQueryFormatType;
    datasource: DataSourceRef;
    legendFormat?: string;
    intervalFactor?: number;
    step?: number;
    instant?: boolean;
    range?: boolean;
}

export type ReducerFunctions = "avg" | "max";

export interface MetricsQueryDimensionFiter {
    dimension: string;
    operator: string;
    filters: string[];
}
