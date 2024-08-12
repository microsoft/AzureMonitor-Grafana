import { EmbeddedScene, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneQueryRunner, SceneRefreshPicker, SceneTimePicker, SceneVariableSet, VariableValueSelectors, VizPanel } from "@grafana/scenes";
import { ClusterMapping } from "types";
import { AGG_VAR, AZMON_DS_VARIABLE } from "../../../constants";
import { GetClusterStatsQueries, GetClustersQuery, TransformData } from "../Queries/ClusterMappingQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries } from "../Queries/queryUtil";
import { getCustomVariable, getDataSourcesVariableForType, getSubscriptionVariable } from "../Variables/variables";




export function getclustersScene(): SceneAppPage {
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
                  pluginId: 'azure-monitoring-app-custom-table',
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
          clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values, clusterData[0]?.fields[2]?.values);
          const clusterStatsQueries = GetClusterStatsQueries(clusterMappings);
          clusterTrendData.setState({ datasource: {
            type: 'datasource',
            uid: '-- Mixed --',
          }, 
          queries: clusterStatsQueries });
          clusterTrendData.runQueries();
        }
      });

      return () => {
        clusterDataSub.unsubscribe();
      }
    });

    const clustersTab = new SceneAppPage({
        title: "Clusters",
        url: "/a/azure-cloudnativemonitoring-app/clusternavigation/clusters",
        getScene: () => scene,
    });
    return clustersTab;
}
