import { DataSourceVariable, EmbeddedScene, QueryVariable, SceneAppPage, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneTimePicker, SceneTimeRange, SceneVariableSet, VariableValueSelectors, VizPanel, sceneGraph } from '@grafana/scenes';
import { TelemetryClient } from 'telemetry/telemetry';
import { ReportType } from 'telemetry/types';
import { ClusterMapping } from 'types';
import { stringify } from 'utils/stringify';
import { AZURE_MONITORING_PLUGIN_ID, CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE } from '../../../constants';
import { GetClusterByWorkloadQueries, TransfomClusterByWorkloadData } from '../Queries/ClusterByWorkloadQueries';
import { GetClustersQuery } from '../Queries/ClusterMappingQueries';
import { azure_monitor_queries } from '../Queries/queries';
import { createMappingFromSeries, getInstanceDatasourcesForType, getPromDatasource, getSceneQueryRunner } from '../Queries/queryUtil';
import { getPrometheusVariable } from '../Variables/variables';
import { getAlertSummaryDrilldownPage } from './AlertSummaryDrilldown';
import { getComputeResourcesDrilldownPage } from './ComputeResourcesDrilldown';
import { getBehaviorsForVariables, getGenericSceneAppPage, getMissingDatasourceScene, getSharedSceneVariables } from './sceneUtils';

function getWorkloadsVariables() {
  const namespaceVariableRaw = `label_values(kube_namespace_status_phase,namespace)`;
  const variables = getSharedSceneVariables(false);
  variables.push(getPrometheusVariable(NS_VARIABLE, "Namespace", namespaceVariableRaw, true));

  return variables;
}

export function getClusterByWorkloadScene(telemetryClient: TelemetryClient) {
  const sceneTitle = 'Workloads';
  const sceneUrl = `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/workloads`;
  // always check first that there is at least one azure monitor datasource
  const azMonDatasources = getInstanceDatasourcesForType('grafana-azure-monitor-datasource');
  const promDatasources = getInstanceDatasourcesForType('prometheus');
  const reporter = 'Scene.Main.WorkloadsScene';
  const bothDatasourcesMissing = azMonDatasources.length === 0 && promDatasources.length === 0;
    if (azMonDatasources.length === 0) {
      const textToShow = bothDatasourcesMissing ? "Azure Monitor or Prometheus" : "Azure Monitor";
      return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene(textToShow, reporter, telemetryClient));
    }

  // get cluster data and initialize mappings
  const clusterData = GetClustersQuery(azure_monitor_queries['clustersQuery']);
  let clusterMappings: Record<string, ClusterMapping> = {};

  // check if there is at least one prom datasource
  if (promDatasources.length === 0) {
    return getGenericSceneAppPage(sceneTitle, sceneUrl, () => getMissingDatasourceScene('Prometheus', reporter, telemetryClient));
  }

  // build data scene
  const variables = getWorkloadsVariables();
  const clusterByWorkloadQueries = GetClusterByWorkloadQueries()
  const clusterByWorkloadData = getSceneQueryRunner(clusterByWorkloadQueries);
  const transformedData = TransfomClusterByWorkloadData(clusterByWorkloadData, telemetryClient);

  const getScene = () => {
    telemetryClient.reportPageView("grafana_plugin_page_view", {
      reporter: reporter,
      type: ReportType.PageView,
    });
    return new EmbeddedScene({
      $data: clusterData,
      $variables: new SceneVariableSet({
        variables: variables,
      }),
      $behaviors: getBehaviorsForVariables(variables, telemetryClient),
      controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
      $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
      body: new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            $data: transformedData,
            height: 500,
            body: new VizPanel({
              pluginId: 'azure-monitor-app-custom-table',
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
        try {
          const newPromDs = clusterMappings[selectedCluster]?.promDs;
          if (!!newPromDs && newPromDs.uid) {
            promDSVar.changeValueTo(newPromDs.uid);
          }
        } catch (e) {
          telemetryClient.reportException("grafana_plugin_promdsvarchange_failed", {
            reporter: reporter,
            exception: e instanceof Error ? e : new Error(stringify(e)),
            type: ReportType.Exception,
            trigger: "cluster_change"
          });
          throw new Error(stringify(e));
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
          telemetryClient.reportException("grafana_plugin_promdsvarchange_failed", {
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
      clusterDataSub.unsubscribe();
    }
  });

  const sceneAppPage =  new SceneAppPage({
    title: 'Workloads',
    getScene: () => scene,
    url: `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/workloads`,
  });

  sceneAppPage.setState({ drilldowns: [
    {
      routePath: `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/workloads/alertsummary/:namespace`,
      getPage: (routeMatch, parent) => getAlertSummaryDrilldownPage(routeMatch, parent, "workloads", telemetryClient),
    },
    {
      routePath:
        `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/workload/computeresources`,
      getPage: (routeMatch, parent) => getComputeResourcesDrilldownPage(routeMatch, parent, telemetryClient),
    },
  ]});
  return sceneAppPage;
}
