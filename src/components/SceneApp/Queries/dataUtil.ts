import { DataLink, FieldConfig, IconName } from "@grafana/data";
import { getTemplateSrv } from "@grafana/runtime";
import { TableCellDisplayMode } from "@grafana/schema";
import { Badge, BadgeColor, Icon, Stack, TableCustomCellOptions, TableFieldOptions, Text } from "@grafana/ui";
import React from "react";
import { ReducerFunctions } from "./types";

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
        return React.createElement(Stack, { direction: "row", gap: 1, alignItems: "center", justifyContent: "center" }, 
            React.createElement(Icon, { name: `${iconName}`, style: { color: `${ color}` } }),
            React.createElement(Text, undefined, value)
        );
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
