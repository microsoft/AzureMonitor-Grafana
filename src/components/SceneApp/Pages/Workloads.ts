import { DataSourceVariable, EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneTimePicker, SceneTimeRange, SceneVariableSet, VariableValueSelectors, VizPanel, sceneGraph } from '@grafana/scenes';
import { GetClusterByWorkloadQueries, TransfomClusterByWorkloadData } from '../Queries/ClusterByWorkloadQueries';
import { createMappingFromSeries, getInstanceDatasourcesForType, getPromDatasource, getSceneQueryRunner } from '../Queries/queryUtil';
import { getAlertSummaryDrilldownPage } from './AlertSummaryDrilldown';
import { getComputeResourcesDrilldownPage } from './ComputeResourcesDrilldown';
import { getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables } from './sceneUtils';
import { ClusterMapping } from 'types';
import { GetClustersQuery } from '../Queries/ClusterMappingQueries';
import { azure_monitor_queries } from '../Queries/queries';
import { CLUSTER_VARIABLE, PROM_DS_VARIABLE } from '../../../constants';

export function getClusterByWorkloadScene() {
  const sceneTitle = 'Workloads';
  const sceneUrl = '/a/azure-azurekubernetesmonitoring-app/clusternavigation/workloads';
  // always check first that there is at least one azure monitor datasource
  const azMonDatasources = getInstanceDatasourcesForType('grafana-azure-monitor-datasource');
  if (azMonDatasources.length === 0) {
    return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene('Azure Monitor'));
  }

  // get cluster data and initialize mappings
  const clusterData = GetClustersQuery(azure_monitor_queries['clustersQuery']);
  let clusterMappings: Record<string, ClusterMapping> = {};

  // check if there is at least one prom datasource
  const promDatasources = getInstanceDatasourcesForType('prometheus');
  if (promDatasources.length === 0) {
    return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene('Azure Monitor'));
  }

  // build data scene
  const params = new URLSearchParams(window.location.search);
  const namespace = params.get('namespace') ?? '';
  const variables = getSharedSceneVariables(false);
  const clusterByWorkloadQueries = GetClusterByWorkloadQueries(namespace)
  const clusterByWorkloadData = getSceneQueryRunner(clusterByWorkloadQueries);
  const transformedData = TransfomClusterByWorkloadData(clusterByWorkloadData);

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
            $data: transformedData,
            body: new VizPanel({
              pluginId: 'azure-monitoring-app-custom-table',
              options: {
                  initialSortBy: [
                    {
                      displayName: "Namespace",
                      desc: false
                  }
                ]
              },
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
    // make sure if cluster changes, we try and find a new prom datasource and rerun the queries
    const clusterVar = sceneGraph.lookupVariable(CLUSTER_VARIABLE, scene) as QueryVariable;
    const promDSVar = sceneGraph.lookupVariable(PROM_DS_VARIABLE, scene) as DataSourceVariable;
    const clusterVarSub = clusterVar?.subscribeToState((state) => {
        const selectedCluster = state.value.toString();
        const newPromDs = clusterMappings[selectedCluster]?.promDs;
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
      clusterVarSub?.unsubscribe();
      clusterDataSub.unsubscribe();
    }
  });

  const sceneAppPage =  new SceneAppPage({
    title: 'Workloads',
    getScene: () => scene,
    url: '/a/azure-azurekubernetesmonitoring-app/clusternavigation/workloads',
  });

  sceneAppPage.setState({ drilldowns: [
    {
      routePath: '/a/azure-azurekubernetesmonitoring-app/clusternavigation/workloads/alertsummary/:namespace',
      getPage: (routeMatch, parent) => getAlertSummaryDrilldownPage(routeMatch, parent, "workloads"),
    },
    {
      routePath:
        '/a/azure-azurekubernetesmonitoring-app/clusternavigation/workload/computeresources',
      getPage: getComputeResourcesDrilldownPage,
    },
  ]});
  return sceneAppPage;
}