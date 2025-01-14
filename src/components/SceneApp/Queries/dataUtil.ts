import { DataLink, FieldConfig, IconName } from "@grafana/data";
import { getTemplateSrv } from "@grafana/runtime";
import { TableCellDisplayMode } from "@grafana/schema";
import { Badge, BadgeColor, TableCustomCellOptions, TableFieldOptions } from "@grafana/ui";
import React from "react";
import CellWithIcon from "../CustomComponents/cellWithIcon";
import { ReducerFunctions } from "./types";
import { prefixRoute } from "utils/utils.routing";

export function getReducerValueFor(reducerFunction: ReducerFunctions, numbers: number[]): number | null {
    if (numbers.length === 0) {
        return null;
    }
    const sum = numbers.reduce((acc, currentVal) => acc + currentVal, 0);
    switch (reducerFunction) {
        case ("avg"):
            return sum / numbers.length;
        case ("max"):
            return Math.max(...numbers);
        default:
            return sum;
    }
}
export function formatReadyTotal(ready: number | undefined, total: number | undefined): string {
    const newReady = !!ready ? Math.round(ready).toString() : "--";
    const newTotal = !!total ? Math.round(total).toString() : "--";

    return `${newReady} / ${newTotal}`;
}

export function castFieldNameToAgg(fieldName: string): ReducerFunctions {
    switch (fieldName) {
        case "avg":
            return "avg";
        case "max":
            return "max";
        default:
            return "avg";
    }
}

export function getValidInvalidCustomFieldConfig(width: number, invalidIcon: IconName, invalidColor: string, checkValue: (value: any) => boolean, links?: DataLink[]): FieldConfig {
    const options: TableCustomCellOptions = {
      type: TableCellDisplayMode.Custom,
      cellComponent: (props) => {
        const value = props.value as string;
        const iconName = checkValue(value) ? "check-circle" : invalidIcon;
        const color = checkValue(value) ? "green" : invalidColor;
        return CellWithIcon({ iconName, color, cellValue: value, type: "grafana-builtin"});
      }
    };
  
    const fieldConfig: TableFieldOptions = {
      cellOptions: options,
      inspect: false,
      width: width,
      align: "left",
    };
  
    return { custom: fieldConfig, links: links };
  }

  export function getCustomFieldConfigBadge(color: BadgeColor) {
    const options: TableCustomCellOptions = {
      type: TableCellDisplayMode.Custom,
      cellComponent: (props) => {
          const value = props.value as string;
          const cellContent = !!value ? React.createElement(Badge, { text: value, color: color}) : "--";
          return React.createElement(
            'div',
            { style: {display: 'flex', alignItems: 'center'}},
            cellContent,
          );
      }
    };
  
    const fieldConfig: TableFieldOptions = {
      cellOptions: options,
      inspect: false,
      align: "left",
    };
  
    return { custom: fieldConfig };
  }

export function interpolateVariables(message: string): string {
    const templateSrv = getTemplateSrv();

    return templateSrv.replace(message);
}

// drilldown urls have some query parmeters in common, this ensures parameter consistency
export function getDataLink(basePath: string, urlParameters?: string) {
  return `${prefixRoute(basePath)}?\${__url_time_range}${!!urlParameters ? `&${urlParameters}` : ""}`;
}
