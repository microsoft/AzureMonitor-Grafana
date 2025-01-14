import { DataSourceVariable, EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, sceneGraph, SceneRefreshPicker, SceneTimePicker, SceneVariableSet, VariableValueSelectors, VizPanel } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { CLUSTER_VARIABLE, PROM_DS_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE, VAR_ALL } from "../../../constants";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { GetClusterOverviewSceneQueries, TranformClusterOverviewData } from "../Queries/ClusterOverviewQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getInstanceDatasourcesForType, getPromDatasource, getSceneQueryRunner } from "../Queries/queryUtil";
import { getAlertSummaryDrilldownPage } from "./AlertSummaryDrilldown";
import { getBehaviorsForVariables, getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables, variableShouldBeCleared } from "./sceneUtils";
import { prefixRoute } from "utils/utils.routing";


export function getNamespacesScene(pluginReporter: Reporter): SceneAppPage {
    const sceneTitle = "Namespaces";
    const sceneUrl = prefixRoute(ROUTES.Namespaces);
    const reporter = "Scene.Main.NamespacesScene";
    // always check first that there is at least one azure monitor datasource
    const azMonDatasources = getInstanceDatasourcesForType("grafana-azure-monitor-datasource");
    const promDatasources = getInstanceDatasourcesForType("prometheus");
    const bothDatasourcesMissing = azMonDatasources.length === 0 && promDatasources.length === 0;
    if (azMonDatasources.length === 0) {
      const textToShow = bothDatasourcesMissing ? "Azure Monitor or Prometheus" : "Azure Monitor";
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene(textToShow, reporter, pluginReporter));
    }

    // get cluster data and initialize mappings
    const clusterData = GetClustersQuery(azure_monitor_queries["clustersQuery"]);
    let clusterMappings: Record<string, ClusterMapping> = {};

    // check if there is at least one prom datasource
    if (promDatasources.length === 0) {
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene("Prometheus", reporter, pluginReporter));
    }
    const variables = getSharedSceneVariables(false);

    const clusterOverviewQueries = GetClusterOverviewSceneQueries();
    const clusterOverviewData = getSceneQueryRunner(clusterOverviewQueries);
    const transformedClusterOverviewData = TranformClusterOverviewData(clusterOverviewData, clusterData);

    const getScene = () => {
      pluginReporter.reportPageView("grafana_plugin_page_view", {
        reporter: reporter,
        type: ReportType.PageView,
      });
      return new EmbeddedScene({
        $data: clusterData,
        $variables: new SceneVariableSet({
          variables: variables,
        }),
        $behaviors: getBehaviorsForVariables(variables, pluginReporter),
        controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
        body: new SceneFlexLayout({
          direction: 'column',
          children: [
            new SceneFlexItem({
                $data: transformedClusterOverviewData,
                height: 500,
                body: new VizPanel({
                  pluginId: 'azure-monitor-app-custom-table',
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
        // check if options were returned once the variable is done loading.
        if (variableShouldBeCleared(state.options, state.value, state.loading)) {
          clusterVar.changeValueTo("");
        }
        const newSelectedCluster = state.value.toString();
        try {
          const newPromDs = clusterMappings[newSelectedCluster]?.promDs;
          if (!!newPromDs && newPromDs.uid) {
            promDSVar.changeValueTo(newPromDs.uid);
          }
        } catch (e) {
          pluginReporter.reportException("grafana_plugin_promdsvarchange_failed", {
            reporter: reporter,
            exception: e instanceof Error ? e : new Error(stringify(e)),
            type: ReportType.Exception,
            trigger: "cluster_change"
          });
          throw new Error(stringify(e));
        }
      });
      
      // if datasource changes, make sure subscription variable gets cleared
      const subVariable = sceneGraph.lookupVariable(SUBSCRIPTION_VARIABLE, scene) as QueryVariable;
      const subVariableSub = subVariable?.subscribeToState((state) => {
        if (variableShouldBeCleared(state.options, state.value, state.loading)) {
          subVariable.changeValueTo(VAR_ALL);
        }
      });
      // make sure that mappings are updated if cluster data changes
      const clusterDataSub = clusterData.subscribeToState((state) => {
        if (state.data?.state === "Done") {
          const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
          const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
          try {
            clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values);
            const promDs = getPromDatasource(clusterMappings, promDatasources);
            if (!!promDs && promDs.uid) {
              promDSVar.changeValueTo(promDs.uid);
            }
          } catch (e) {
            pluginReporter.reportException("grafana_plugin_promdsvarchange_failed", {
              reporter: reporter,
              exception: e instanceof Error ? e : new Error(stringify(e)),
              type: ReportType.Exception,
              trigger: "cluster_mappings_change"
            });
            throw new Error(stringify(e));
          }
        }
      });
      return () => {
        clusterVarSub?.unsubscribe();
        clusterDataSub?.unsubscribe();
        subVariableSub?.unsubscribe();
      }
    });
    const clusterOverviewTab = new SceneAppPage({
      title: "Namespaces",
      url: sceneUrl,
      getScene: () => scene,
      drilldowns: [
        {
          routePath: prefixRoute(`${ROUTES.Namespaces}/${ROUTES.AlertSummary}/:namespace`),
          getPage: (routeMatch, parent) => getAlertSummaryDrilldownPage(routeMatch, parent, "namespaces", pluginReporter)
        },
      ]
    });
    return clusterOverviewTab;
}
