import { QueryVariable, DataSourceVariable, CustomVariable, TextBoxVariable } from "@grafana/scenes";
import { getAzureResourceGraphQuery } from "../Queries/queryUtil";
import { VariableHide } from "@grafana/schema";
import { AZMON_DS_VARIABLE, PROM_DS_VARIABLE, SUBSCRIPTION_VARIABLE } from "../../../constants";

export function getSubscriptionVariable(hide?: boolean) {
    return new QueryVariable({
        name: SUBSCRIPTION_VARIABLE,
        label: "Subscription",
        placeholder: "Azure Monitor Subscription",
        datasource: {
            type: "grafana-azure-monitor-datasource",
            uid:`\${${AZMON_DS_VARIABLE}}`
        },
        query: {
            queryType: "Azure Subscriptions",
            refId: "A",
        },
        isMulti: true,
        includeAll: true,
        hide: hide ? VariableHide.hideVariable : VariableHide.dontHide,
    });
}

export function getResourceGraphVariable(query: string, sub: string, name: string, label: string, placeholder: string, multi: boolean) {
    const varQuery = getAzureResourceGraphQuery(query, sub, "A");
    return new QueryVariable({
        name: name,
        label: label,
        placeholder: placeholder,
        isMulti: multi,
        includeAll: multi,
        defaultToAll: multi,
        datasource: {
            type: "grafana-azure-monitor-datasource",
            uid: `\${${AZMON_DS_VARIABLE}}`
        },
        query: varQuery,
        value: '',
        text: '',
    });
}


export function getDataSourcesVariableForType(dsType: string, name: string, label: string, hide?: boolean) {
    return new DataSourceVariable({
        name: name,
        label: label,
        pluginId: dsType,
        hide: hide ? VariableHide.hideVariable : VariableHide.dontHide,
      });
}

export function getPrometheusVariable(name: string, label: string, query: string) {
    const promDatasource = {type: "prometheus", uid: `\${${PROM_DS_VARIABLE}}`};
    return new QueryVariable({
        name: name,
        label: label,
        datasource: promDatasource,
        query: {
            query: query,
            refId: "A",

        }
    });
}

export function getCustomVariable(name: string, label: string, options: string): CustomVariable {
    return new CustomVariable({
        name: name,
        label: label,
        query: options,
    })
}

export function getTextVariable(name: string, value: string): TextBoxVariable {
    return new TextBoxVariable({
        name: name,
        value: value,
        hide: VariableHide.hideVariable
    });
}
