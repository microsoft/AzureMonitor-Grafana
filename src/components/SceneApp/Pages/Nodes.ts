import { EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneTimePicker, SceneTimeRange, SceneVariableSet, VariableValueSelectors, VizPanel, sceneGraph } from "@grafana/scenes";
import { createMappingFromSeries, getInstanceDatasourcesForType, getSceneQueryRunner } from "../Queries/queryUtil";
import { getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables } from "./sceneUtils";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { ClusterMapping } from "types";
import { GetNodeOverviewQueries, TransformNodeOverviewData } from "../Queries/NodeOverviewQueries";
import { CLUSTER_VARIABLE } from "../../../constants";

export function getOverviewByNodeScene(): SceneAppPage {
    const sceneTitle = "Nodes";
    const sceneUrl = "/a/azure-azurekubernetesmonitoring-app/clusternavigation/nodes";
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

    // build data scene
    const variables = getSharedSceneVariables(false);
    const nodeOverviewQueries = GetNodeOverviewQueries(clusterMappings, []);
    const nodeOverviewData = getSceneQueryRunner(nodeOverviewQueries);
    const transformedNodeOverviewData = TransformNodeOverviewData(nodeOverviewData);
    
    const getScene = () => {
        return new EmbeddedScene({
            $data: clusterData,
            $variables: new SceneVariableSet({
              variables: variables,
            }),
            controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({ })],
            $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
            body: new SceneFlexLayout({
              direction: 'column',
              children: [
                    new SceneFlexItem({
                        $data: transformedNodeOverviewData,
                        body: new VizPanel({
                            title: undefined,
                            pluginId: 'azure-monitoring-app-custom-table',
                            options: {},
                            fieldConfig: {
                                defaults: { 
                                    noValue: "--",
                                },
                                overrides: []
                            }
                        }),
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
            const newSelectedCluster = state.value.toString();
            const newQueries = GetNodeOverviewQueries(clusterMappings, [newSelectedCluster]);
            nodeOverviewData.setState({ queries: newQueries });
            nodeOverviewData.runQueries();
        });

        // if clujster mappings get updated, also rerun the queries
        const clusterDataSub = clusterData.subscribeToState((state) => {
            if (state.data?.state === "Done") {
                const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
                const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
                clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values, clusterData[0]?.fields[2]?.values);
                const newQueries = GetNodeOverviewQueries(clusterMappings, [clusterVar.state.value.toString()]);
                nodeOverviewData.setState({ queries: newQueries });
                nodeOverviewData.runQueries();
            }
        });
        return () => {
            clusterVarSub.unsubscribe();
            clusterDataSub.unsubscribe();
        }
    });

    const nodesTab = new SceneAppPage({
        title: sceneTitle,
        url: sceneUrl,
        getScene: () => scene,
    });

    return nodesTab;
}