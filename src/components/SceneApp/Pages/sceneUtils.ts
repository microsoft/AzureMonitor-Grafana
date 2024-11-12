import { behaviors, CustomVariable, DataSourceVariable, EmbeddedScene, PanelBuilders, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRouteMatch, TextBoxVariable, VariableValue, VariableValueOption } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { AZMON_DS_VARIABLE, AZURE_MONITORING_PLUGIN_ID, CLUSTER_VARIABLE, PROM_DS_VARIABLE, SUBSCRIPTION_VARIABLE } from "../../../constants";
import { azure_monitor_queries } from "../Queries/queries";
import { getDataSourcesVariableForType, getResourceGraphVariable, getSubscriptionVariable } from "../Variables/variables";

export function getGenericSceneAppPage(title: string, url: string, getScene: (routeMatch: SceneRouteMatch<{}>) => EmbeddedScene) {
    return new SceneAppPage({
        title: title,
        url: url,
        getScene: getScene,
    });
}
export function getMissingDatasourceScene(missingDs: string, reporter: string, pluginReporter: Reporter) {
    pluginReporter.reportPageView("grafana_plugin_missingdsscene_view", {
        reporter: reporter,
        missingDatasource: missingDs,
        type: ReportType.PageView,
    });
    return new EmbeddedScene({
        body: new SceneFlexLayout({
            direction: 'column',
            children: [
                new SceneFlexItem({
                    width: '100%',
                    height: 300,
                    body: PanelBuilders.text().setTitle("").setOption('content', 
                        `> ### ⚠️ No ${missingDs} datasources found <br>\n> ##### This plugin requires Azure Monitor and Prometheus datasources to work.  \n> ##### Please go to [connections](/connections/datasources) configure the appropriate datasources. For more information, see our [documentation](/plugins/${AZURE_MONITORING_PLUGIN_ID})`).setDisplayMode("transparent").build(),
                }),
            ],
        }),
    });
}

export function getSharedSceneVariables(drilldownScene: boolean) {
    const variables = [];
    variables.push(getDataSourcesVariableForType("grafana-azure-monitor-datasource", AZMON_DS_VARIABLE, "Azure Monitor Datasource", drilldownScene));
    variables.push(getSubscriptionVariable(drilldownScene));
    variables.push(getResourceGraphVariable(azure_monitor_queries["clustersVariableQuery"], `\$${SUBSCRIPTION_VARIABLE}`, CLUSTER_VARIABLE, "AKS Cluster", "Select a cluster", false));
    variables.push(getDataSourcesVariableForType("prometheus", PROM_DS_VARIABLE, "Prometheus Datasource", true));
  
    return variables;
}

export function getBehaviorsForVariables(variables: Array<DataSourceVariable | QueryVariable | CustomVariable | TextBoxVariable>, pluginReporter: Reporter) {
    const variableNames = variables.map((v) => v.state.name);   
    return variableNames.map((name) => {
        return new behaviors.ActWhenVariableChanged({
            variableName: name,
            onChange: (variable) => {
                pluginReporter.reportEvent("grafana_plugin_variable_changed", {
                    variableName: variable.state.name, 
                    variableType: variable.state.type,
                    variableValue: variable.state.$data,
                    type: ReportType.Event,
                });

                if (variable.state.error) {
                    pluginReporter.reportException("grafana_plugin_variable_error", {
                        variableName: variable.state.name,
                        variableType: variable.state.type,
                        variableValue: variable.state.$data,
                        type: ReportType.Exception,
                        error: variable.state.error,
                    });
                }
            }
        })
    });
}

/**
 * This function checks whether the variable needs to be cleared
 * if the available options are empty, variable should be cleared
 * if the available options are not empty, but the current selected value is not part of the available options, variable should be cleared
 * if the variable is still loading, variable should not be cleared
 * if the variable options are not empty, and the current selected value is part of the available options, variable should not be cleared
 * @param variableOptions available variable options
 * @param currentVariableValue currently selected variable value
 * @param variableIsLoading whether the variable is still loading or not
 */
export function variableShouldBeCleared(variableOptions: VariableValueOption[], currentVariableValue: VariableValue, variableIsLoading: boolean | undefined) {
    if (variableIsLoading) {
        return false;
    }

    if (variableOptions.length === 0 && currentVariableValue !== "") {
        return true;
    } else if (variableOptions.length > 0 && currentVariableValue === "") {
        return true;
    }

    const currentValues = Array.isArray(currentVariableValue) ? currentVariableValue : [currentVariableValue];
    const optionValues = variableOptions.map(option => option.value);

    for (const value of currentValues) {
        if (!optionValues.includes(value)) {
            return true;
        }
    }

    return false;
}
