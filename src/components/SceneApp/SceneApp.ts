import { PanelPlugin } from "@grafana/data";
import { SceneApp, SceneAppPage, sceneUtils } from "@grafana/scenes";
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
        title: 'Azure Kubernetes Service Monitoring',
        url: '/a/azure-cloudnativemonitoring-app/clusternavigation',
        // $variables: new SceneVariableSet({
        //   variables: [
        //       getDataSourcesVariableForType("grafana-azure-monitor-datasource", "AZMON_DS", "Azure Monitor Datasource"),
        //       getSubscriptionVariable(),
        //   ]
        // }),
        // controls: [ new VariableValueSelectors({}), new SceneTimePicker({}) ],
        tabs: [clustersTab, clusterOverviewTab, workloadsTab, nodesTab]
    });
    return new SceneApp({
      pages: [myAppPage],
    });
}
