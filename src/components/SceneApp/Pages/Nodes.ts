import { EmbeddedScene, PanelBuilders, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneTimePicker, SceneVariableSet, VariableValueSelectors, VizPanel, sceneGraph } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { CLUSTER_VARIABLE, ROUTES, SUBSCRIPTION_VARIABLE } from "../../../constants";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { GetNodeOverviewQueries, TransformNodeOverviewData } from "../Queries/NodeOverviewQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getInstanceDatasourcesForType, getSceneQueryRunner } from "../Queries/queryUtil";
import { getBehaviorsForVariables, getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables, variableShouldBeCleared } from "./sceneUtils";
import { prefixRoute } from "utils/utils.routing";

export function getOverviewByNodeScene(pluginReporter: Reporter): SceneAppPage {
    const sceneTitle = "Nodes";
    const sceneUrl = prefixRoute(ROUTES.Nodes);
    const reporter = "Scene.Main.NodesScene";
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

    // build data scene
    const variables = getSharedSceneVariables(false);
    const nodeOverviewQueries = GetNodeOverviewQueries(clusterMappings, []);
    const nodeOverviewData = getSceneQueryRunner(nodeOverviewQueries);
    const transformedNodeOverviewData = TransformNodeOverviewData(nodeOverviewData);
    
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
            controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({ })],
            body: new SceneFlexLayout({
              direction: 'row',
              children: [
                    new SceneFlexLayout({
                        direction: 'column',
                        children: [
                            new SceneFlexItem({
                                height: 5,
                                body: PanelBuilders.text().setTitle("").setDisplayMode("transparent").build(),
                            }),
                            new SceneFlexItem({
                                $data: transformedNodeOverviewData,
                                height: 500,
                                body: new VizPanel({
                                    title: undefined,
                                    pluginId: 'azure-monitor-app-custom-table',
                                    options: {},
                                    fieldConfig: {
                                        defaults: { 
                                            noValue: "--",
                                        },
                                        overrides: [
                                            {
                                                matcher: {
                                                    id: "byRegexp",
                                                    options: "/.*/"
                                                },
                                                properties: [
                                                    {
                                                        id: "links",
                                                        value: [/** to be replaced by links that take to portal experience */]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    displayMode: "transparent"
                                }),  
                            })
                        ]
                    }),
                    new SceneFlexItem({
                        height: 200,
                        width: "20%",
                        body: PanelBuilders.text().setTitle("").setOption("content", "|                                       |                                     |\n|---------------------------------------|-------------------------------------|\n| <span style=\"color:#ff9830\">low</span> | low usage (<60%)                    |\n| <span style=\"color:#73bf69\">med</span>  | well used (between 60% and 90%)     |\n| <span style=\"color:#f2495c\">high</span>   | high usage (>90%)                   |").setDisplayMode("transparent").build(),
                    })
                ],
              }),
          });
    };

    const scene = getScene();
    scene.addActivationHandler(() => {
        // make sure if cluster changes we rerun queries for newly selected clusters
        const clusterVar = sceneGraph.lookupVariable(CLUSTER_VARIABLE, scene) as QueryVariable;
        const clusterVarSub = clusterVar?.subscribeToState((state) => {
            // check if options were returned once the variable is done loading.
            if (variableShouldBeCleared(state.options, state.value, state.loading)) {
                clusterVar.changeValueTo("");
            }
            const newSelectedCluster = state.value.toString();
            try {
                const newQueries = GetNodeOverviewQueries(clusterMappings, [newSelectedCluster]);
                nodeOverviewData.setState({ queries: newQueries });
                nodeOverviewData.runQueries();
            } catch (e) {
                pluginReporter.reportException("grafana_plugin_runqueries_failed", {
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
            subVariable.changeValueTo("");
            }
        });

        // if cluster mappings get updated, also rerun the queries
        const clusterDataSub = clusterData.subscribeToState((state) => {
            if (state.data?.state === "Done") {
                const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
                const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
                try {
                    clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values, clusterData[0]?.fields[2]?.values);
                    const newQueries = GetNodeOverviewQueries(clusterMappings, [clusterVar.state.value.toString()]);
                    nodeOverviewData.setState({ queries: newQueries });
                    nodeOverviewData.runQueries();
                } catch (e) {
                    pluginReporter.reportException("grafana_plugin_runqueries_failed", {
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

    const nodesTab = new SceneAppPage({
        title: sceneTitle,
        url: sceneUrl,
        getScene: () => scene,
    });

    return nodesTab;
}
