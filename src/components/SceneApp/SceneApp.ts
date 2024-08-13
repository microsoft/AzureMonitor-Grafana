import { PanelPlugin } from "@grafana/data";
import { SceneApp, SceneAppPage, sceneUtils } from "@grafana/scenes";
import { AzureIcon } from "components/img/AzureIcon";
import React from "react";
import { getclustersScene } from "./Pages/Clusters";
import { getClusterOverviewScene } from "./Pages/Namespaces";
import { getOverviewByNodeScene } from "./Pages/Nodes";
import { getClusterByWorkloadScene } from "./Pages/Workloads";
import { CustomTable, CustomTableVizFieldOptions, CustomTableVizOptions } from "./PanelVisualizations/CustomTable";
import { ConfigurationState } from "./SceneObjects/types";

const customTable = new PanelPlugin<CustomTableVizOptions, CustomTableVizFieldOptions>(CustomTable).useFieldConfig({
  useCustomConfig(builder) {
    builder.addNumberInput({
      path: 'numericOption',
      name: 'Numeric option',
      description: 'A numeric option',
      defaultValue: 1,
    });
  },
});
sceneUtils.registerRuntimePanelPlugin({ pluginId: 'azure-monitoring-app-custom-table', plugin: customTable });
export function getSceneApp(_configState: Partial<ConfigurationState>, _setConfigState: (configState: Partial<ConfigurationState>) => void): SceneApp {
    const clusterOverviewTab = getClusterOverviewScene();
    const clustersTab = getclustersScene();
    const workloadsTab = getClusterByWorkloadScene();
    const nodesTab = getOverviewByNodeScene();
    const myAppPage = new SceneAppPage({
        title: 'Azure Cloud Native Monitoring',
        url: '/a/azure-cloudnativemonitoring-app/clusternavigation',
        tabs: [clustersTab, clusterOverviewTab, workloadsTab, nodesTab],
        renderTitle: (title: string) => {
          return React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
            React.createElement(AzureIcon),
            React.createElement('span', { style: { fontSize: "xx-large", paddingLeft: "15px" } }, title)
          );
        },
    });
    return new SceneApp({
      pages: [myAppPage],
    });
}
