import { PanelPlugin } from "@grafana/data";
import { SceneApp, SceneAppPage, sceneUtils } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import SceneTitle from "./CustomComponents/sceneTitle";
import { getclustersScene } from "./Pages/Clusters";
import { getNamespacesScene } from "./Pages/Namespaces";
import { getOverviewByNodeScene } from "./Pages/Nodes";
import { getClusterByWorkloadScene } from "./Pages/Workloads";
import { CustomTable, CustomTableVizFieldOptions, CustomTableVizOptions } from "./PanelVisualizations/CustomTable";
import { ConfigurationState } from "./SceneObjects/types";
import { prefixRoute } from "utils/utils.routing";

const customTable = new PanelPlugin<CustomTableVizOptions, CustomTableVizFieldOptions>(CustomTable);
sceneUtils.registerRuntimePanelPlugin({ pluginId: 'azure-monitor-app-custom-table', plugin: customTable });
export function getSceneApp(_configState: Partial<ConfigurationState>, _setConfigState: (configState: Partial<ConfigurationState>) => void, pluginReporter: Reporter): SceneApp {
    const namespacesTab = getNamespacesScene(pluginReporter);
    const clustersTab = getclustersScene(pluginReporter);
    const workloadsTab = getClusterByWorkloadScene(pluginReporter);
    const nodesTab = getOverviewByNodeScene(pluginReporter);
    const myAppPage = new SceneAppPage({
        title: 'Azure Cloud Native Monitoring',
        url: prefixRoute(""),
        tabs: [clustersTab, namespacesTab, workloadsTab, nodesTab],
        renderTitle: (title: string) => {
          return SceneTitle({ title });
        },
    });
    return new SceneApp({
      pages: [myAppPage],
    });
}
