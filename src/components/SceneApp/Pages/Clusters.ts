import { EmbeddedScene, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneQueryRunner, SceneRefreshPicker, SceneTimePicker, SceneVariableSet, VariableValueSelectors, VizPanel } from "@grafana/scenes";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { AGG_VAR, AZMON_DS_VARIABLE, AZURE_MONITORING_PLUGIN_ID } from "../../../constants";
import { GetClusterStatsQueries, GetClustersQuery, TransformData } from "../Queries/ClusterMappingQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getInstanceDatasourcesForType } from "../Queries/queryUtil";
import { getCustomVariable, getDataSourcesVariableForType, getSubscriptionVariable } from "../Variables/variables";
import { getGenericSceneAppPage, getMissingDatasourceScene } from "./sceneUtils";
import { reportException } from "telemetry/telemetry";
import { ReportType } from "telemetry/types";



export function getclustersScene(report: (name: string, properties: Record<string, unknown>) => void): SceneAppPage {
    const sceneTitle = "Clusters";
    const sceneUrl = `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/clusters;`
    // always check first that there is at least one azure monitor datasource
    const azMonDatasources = getInstanceDatasourcesForType("grafana-azure-monitor-datasource");
    const promDatasources = getInstanceDatasourcesForType("prometheus");
    const bothDatasourcesMissing = azMonDatasources.length === 0 && promDatasources.length === 0;
    if (azMonDatasources.length === 0) {
      const textToShow = bothDatasourcesMissing ? "Azure Monitor or Prometheus" : "Azure Monitor";
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene(textToShow));
    }

    // check if there is at least one prom datasource
    if (promDatasources.length === 0) {
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene("Prometheus"));
    }
    let clusterMappings: Record<string, ClusterMapping> = {};
    const clusterData = GetClustersQuery(azure_monitor_queries["clustersQuery"]);
    const clusterTrendData = new SceneQueryRunner({queries: []});
    const transformedClusterData = TransformData(clusterTrendData, clusterData);
    const getScene = () => {
      return new EmbeddedScene({
      $data : clusterData,
      $variables: new SceneVariableSet({
        variables: [
            getDataSourcesVariableForType("grafana-azure-monitor-datasource", AZMON_DS_VARIABLE, "Azure Monitor Datasource"),
            getSubscriptionVariable(),
            getCustomVariable(AGG_VAR, "Aggregation", "Avg : avg")
        ]
      }),
      controls: [ new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({}) ],
      body: new SceneFlexLayout({
        direction: "column",
        children: [
          new SceneFlexItem({
              $data: transformedClusterData,
              body: new VizPanel({
                  pluginId: 'azure-monitor-app-custom-table',
                  options: {},
                  fieldConfig: {
                    defaults: { noValue: "--"},
                    overrides: [],
                  },
                  title: undefined
              }),
          }),
        ],
      }),
    });
  };

    const scene = getScene();
    scene.addActivationHandler(() => {  
      const clusterDataSub = clusterData.subscribeToState((state) => {
        if (state.data?.state === "Done") {
          const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
          const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
  
          try {
            clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values, clusterData[0]?.fields[2]?.values);
            const clusterStatsQueries = GetClusterStatsQueries(clusterMappings);
            clusterTrendData.setState({ datasource: {
              type: 'datasource',
              uid: '-- Mixed --',
            }, 
            queries: clusterStatsQueries });
            clusterTrendData.runQueries();
          } catch (e) {
            reportException("grafana_plugin_runqueries_failed", {
              reporter: "Scene.Main.ClustersScene",
              exception: e instanceof Error ? e : new Error(stringify(e)),
              type: ReportType.Exception,
              trigger: "page"
            }, report);
            throw new Error(stringify(e));
          }
        }
      });

      return () => {
        clusterDataSub.unsubscribe();
      }
    });

    const clustersTab = new SceneAppPage({
        title: sceneTitle,
        url: sceneUrl,
        getScene: () => scene,
    });
    return clustersTab;
}
