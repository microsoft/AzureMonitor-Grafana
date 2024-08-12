import { DataSourceVariable, EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneTimePicker, SceneTimeRange, SceneVariableSet, VariableValueSelectors, VizPanel, sceneGraph } from "@grafana/scenes";
import { GetClusterOverviewSceneQueries, TranformClusterOverviewData } from "../Queries/ClusterOverviewQueries";
import { getAlertSummaryDrilldownPage } from "./AlertSummaryDrilldown";
// import { ConfigurationState } from "../SceneObjects/types";
import { createMappingFromSeries, getInstanceDatasourcesForType, getPromDatasource, getSceneQueryRunner } from "../Queries/queryUtil";
import { VariableSelection } from "../SceneObjects/VariableSelection";
// import { getPrometheusVariable } from "../Variables/prometheusVariables";
import { ClusterMapping } from "types";
import { azure_monitor_queries } from "../Queries/queries";
// import { URLSearchParams } from "url";
import { CLUSTER_VARIABLE, PROM_DS_VARIABLE } from "../../../constants";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables } from "./sceneUtils";

export let sharedVariableSelection: VariableSelection;

export function getClusterOverviewScene(): SceneAppPage {
    const sceneTitle = "Namespaces";
    const sceneUrl = "/a/azure-cloudnativemonitoring-app/clusternavigation/namespaces";
    // always check first that there is at least one azure monitor datasource
    const azMonDatasources = getInstanceDatasourcesForType("grafana-azure-monitor-datasource");
    if (azMonDatasources.length === 0) {
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene("Azure Monitor"));
    }

    // get cluster data and initialize mappings
    const clusterData = GetClustersQuery(azure_monitor_queries["clustersQuery"]);
    let clusterMappings: Record<string, ClusterMapping> = {};

    // check if there is at least one prom datasource
    const promDatasources = getInstanceDatasourcesForType("prometheus");
    if (promDatasources.length === 0) {
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene("Prometheus"));
    }
    const variables = getSharedSceneVariables(false);
    const clusterOverviewQueries = GetClusterOverviewSceneQueries();
    const clusterOverviewData = getSceneQueryRunner(clusterOverviewQueries);
    const transformedClusterOverviewData = TranformClusterOverviewData(clusterOverviewData);

    const getScene = () => {
      return new EmbeddedScene({
        $data: clusterData,
        $variables: new SceneVariableSet({
          variables: variables,
        }),
        controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
        $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
        body: new SceneFlexLayout({
          direction: 'column',
          children: [
            new SceneFlexItem({
                $data: transformedClusterOverviewData,
                body: new VizPanel({
                  pluginId: 'azure-monitoring-app-custom-table',
                  options: {},
                  fieldConfig: {
                    defaults: { noValue: "--"},
                    overrides: [],
                  },
                  title: undefined
              }),
              })
            ],
          }),
      });
    };
    const scene = getScene();
    
    scene.addActivationHandler(() => {
      // make sure if cluster changes, we try and find a new prom datasource and rerun the queries
      const clusterVar = sceneGraph.lookupVariable(CLUSTER_VARIABLE, scene) as QueryVariable;
      const promDSVar = sceneGraph.lookupVariable(PROM_DS_VARIABLE, scene) as DataSourceVariable;
      const clusterVarSub = clusterVar?.subscribeToState((state) => {
        const newSelectedCluster = state.value.toString();
        const newPromDs = clusterMappings[newSelectedCluster]?.promDs;
        if (!!newPromDs && newPromDs.uid) {
          promDSVar.changeValueTo(newPromDs.uid);
        }
      });
      
      // make sure that mappings are updated if cluster data changes
      const clusterDataSub = clusterData.subscribeToState((state) => {
        if (state.data?.state === "Done") {
          const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
          const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
          clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values);
          const promDs = getPromDatasource(clusterMappings, promDatasources);
          if (!!promDs && promDs.uid) {
            promDSVar.changeValueTo(promDs.uid);
          }
        }
      });
      return () => {
        clusterVarSub.unsubscribe();
        clusterDataSub.unsubscribe();
      }
    });
    const clusterOverviewTab = new SceneAppPage({
      title: "Namespaces",
      url: "/a/azure-cloudnativemonitoring-app/clusternavigation/namespaces",
      getScene: () => scene,
      drilldowns: [
        {
          routePath: '/a/azure-cloudnativemonitoring-app/clusternavigation/namespaces/alertsummary/:namespace',
          getPage: (routeMatch, parent) => getAlertSummaryDrilldownPage(routeMatch, parent, "namespaces")
        },
      ]
    });
    return clusterOverviewTab;
}
