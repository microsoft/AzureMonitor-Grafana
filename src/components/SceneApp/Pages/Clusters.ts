import { EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, sceneGraph, SceneQueryRunner, SceneRefreshPicker, SceneTimePicker, SceneVariableSet, VariableValueSelectors, VizPanel } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { AGG_VAR, AZMON_DS_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE, VAR_ALL } from "../../../constants";
import { GetClustersQuery, GetClusterStatsQueries, TransformData } from "../Queries/ClusterMappingQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getInstanceDatasourcesForType } from "../Queries/queryUtil";
import { getCustomVariable, getDataSourcesVariableForType, getSubscriptionVariable } from "../Variables/variables";
import { getBehaviorsForVariables, getGenericSceneAppPage, getMissingDatasourceScene, variableShouldBeCleared } from "./sceneUtils";
import { prefixRoute } from "utils/utils.routing";



export function getclustersScene(pluginReporter: Reporter): SceneAppPage {
    const sceneTitle = "Clusters";
    const sceneUrl = prefixRoute(ROUTES.Clusters);
    // always check first that there is at least one azure monitor datasource
    const azMonDatasources = getInstanceDatasourcesForType("grafana-azure-monitor-datasource");
    const promDatasources = getInstanceDatasourcesForType("prometheus");
    const reporter = "Scene.Main.ClustersScene";
    const bothDatasourcesMissing = azMonDatasources.length === 0 && promDatasources.length === 0;
    if (azMonDatasources.length === 0) {
      const textToShow = bothDatasourcesMissing ? "Azure Monitor or Prometheus" : "Azure Monitor";
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene(textToShow, reporter, pluginReporter));
    }

    // check if there is at least one prom datasource
    if (promDatasources.length === 0) {
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene("Prometheus", reporter, pluginReporter));
    }
    let clusterMappings: Record<string, ClusterMapping> = {};
    const clusterData = GetClustersQuery(azure_monitor_queries["clustersQuery"]);
    const clusterTrendData = new SceneQueryRunner({queries: []});
    const transformedClusterData = TransformData(clusterTrendData, clusterData);
    const variables = [
      getDataSourcesVariableForType("grafana-azure-monitor-datasource", AZMON_DS_VARIABLE, "Azure Monitor Datasource"),
      getSubscriptionVariable(),
      getCustomVariable(AGG_VAR, "Aggregation", "Avg : avg")
    ];

    const getScene = () => {
      pluginReporter.reportPageView("grafana_plugin_page_view", {
        reporter: reporter,
        type: ReportType.PageView,
      });
      return new EmbeddedScene({
      $data : clusterData,
      $variables: new SceneVariableSet({
        variables: variables
      }),
      $behaviors: getBehaviorsForVariables(variables, pluginReporter),
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
            pluginReporter.reportException("grafana_plugin_runqueries_failed", {
              reporter: reporter,
              exception: e instanceof Error ? e : new Error(stringify(e)),
              type: ReportType.Exception,
              trigger: "page"
            });
            throw new Error(stringify(e));
          }
        }
      });
      
      // if datasource changes, make sure subscription variable gets cleared
      const subVariable = sceneGraph.lookupVariable(SUBSCRIPTION_VARIABLE, scene) as QueryVariable;
      const subVariableSub = subVariable?.subscribeToState((state) => {
        if (variableShouldBeCleared(state.options, state.value, state.loading)) {
          subVariable.changeValueTo(VAR_ALL);
        }
      });

      return () => {
        clusterDataSub?.unsubscribe();
        subVariableSub?.unsubscribe();
      }
    });

    const clustersTab = new SceneAppPage({
        title: sceneTitle,
        url: sceneUrl,
        getScene: () => scene,
    });
    return clustersTab;
}
