import { DataSourceVariable, EmbeddedScene, QueryVariable, SceneAppPage, SceneAppPageLike, SceneFlexItem, SceneFlexLayout, sceneGraph, SceneRefreshPicker, SceneRouteMatch, SceneTimePicker, SceneVariableSet, TextBoxVariable, VariableValueSelectors } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { ReportType } from "reporter/types";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { prefixRoute } from "utils/utils.routing";
import { CLUSTER_VARIABLE, NS_VARIABLE, PROM_DS_VARIABLE, ROUTES, WORKLOAD_VAR } from "../../../constants";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { GetAvgContainerBandwithReceivedSceneQuery, GetAvgContainerBandwithTransmittedSceneQuery, GetCPUQuotaSceneQuery, GetCPUUsageSceneQuery, GetMemoryQuotaPromSceneQueries, GetMemoryUsageSceneQuery, GetNetworkUsageSceneQueries, GetRateofReceivedPacketsDroppedSceneQuery, GetRateofReceivedPacketsSceneQuery, GetRateofTransmittedPacketsDroppedSceneQuery, GetRateofTransmittedPacketsSceneQuery, GetReceiveBandwidthSceneQuery, GetTransmitBandwidthSceneQuery, TransformData } from "../Queries/ComputeResourcesQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getPromDatasource, getSceneQueryRunner } from "../Queries/queryUtil";
import { getPrometheusVariable, getTextVariable } from "../Variables/variables";
import { getTableVisualizationCPUQuota, getTableVisualizationMemoryQuota, getTableVisualizationNetworkUsage, getTimeSeriesVisualization } from "../Visualizations/ComputeResourcesViz";
import { getPodWithLogsDrillDownPage } from "./PodWithLogsDrilldown";
import { getBehaviorsForVariables, getSharedSceneVariables } from "./sceneUtils";

function getComputeResourcesVariables() {
    const variables: Array<DataSourceVariable | QueryVariable | TextBoxVariable> = getSharedSceneVariables(true);
    const namespaceVariableRaw = `label_values(namespace_workload_pod:kube_pod_owner:relabel{workload=~\"\${${WORKLOAD_VAR}}\"},namespace)`;
    const typeVariableQueryRaw = `label_values(namespace_workload_pod:kube_pod_owner:relabel{cluster=\"\${${CLUSTER_VARIABLE}}\", namespace=\"\${${NS_VARIABLE}}\"},workload_type)`;
    variables.push(getPrometheusVariable(NS_VARIABLE, "Namespace", namespaceVariableRaw));
    variables.push(getPrometheusVariable("type", "Type", typeVariableQueryRaw));
    variables.push(getTextVariable(WORKLOAD_VAR, ""));
    return variables;
}

function getComputeResourcesDrilldownScene(pluginReporter: Reporter) {
    // get cluster data and initialize mappings
    const clusterData = GetClustersQuery(azure_monitor_queries['clustersQuery']);
    let clusterMappings: Record<string, ClusterMapping> = {};
    const timeseriesViz = getTimeSeriesVisualization();
    // CPU usage
    const cpuUsageQueries = GetCPUUsageSceneQuery();
    const cpuUsageData = getSceneQueryRunner(cpuUsageQueries);

    // CPU Quota
    const cpuQuotaQueries = GetCPUQuotaSceneQuery();
    const cpuQuotaData = getSceneQueryRunner(cpuQuotaQueries);
    const transformedCPUQuotaData = TransformData(cpuQuotaData);
    const cpuQuotaViz = getTableVisualizationCPUQuota();

    // Memory Usage
    const memoryUsageQuery = GetMemoryUsageSceneQuery();
    const memoryUsageData = getSceneQueryRunner(memoryUsageQuery);

    // Memory Quota
    const memoryQuotaQuery = GetMemoryQuotaPromSceneQueries();
    const memoryQuotaData = getSceneQueryRunner(memoryQuotaQuery);
    const memoryQuotaTransformedData = TransformData(memoryQuotaData);
    const memoryQuotaViz = getTableVisualizationMemoryQuota();

    // Current Network Usage
    const networkUsageQuery = GetNetworkUsageSceneQueries();
    const networkUsageData = getSceneQueryRunner(networkUsageQuery);
    const networkUsageTransformedData = TransformData(networkUsageData);
    const networkUsageViz = getTableVisualizationNetworkUsage();

    // Receive Bandwith
    const receiveBandwithQuery = GetReceiveBandwidthSceneQuery();
    const receiveBandwidthData = getSceneQueryRunner(receiveBandwithQuery);

    // transmit Bandwith
    const transmitBandwithQuery = GetTransmitBandwidthSceneQuery();
    const transmitBandwidthData = getSceneQueryRunner(transmitBandwithQuery);

    // Average Container Bandwidth by Pod: Received
    const avgContainerBandwithReceivedQuery = GetAvgContainerBandwithReceivedSceneQuery();
    const avgContainerBandwithReceivedData = getSceneQueryRunner(avgContainerBandwithReceivedQuery);

    // Average Container Bandwidth by Pod: Transmitted
    const avgContainerBandwithTransmittedQuery = GetAvgContainerBandwithTransmittedSceneQuery();
    const avgContainerBandwithTransmittedData = getSceneQueryRunner(avgContainerBandwithTransmittedQuery);

    // Rate of Received Packets
    const rateofReceivedPacketsQuery = GetRateofReceivedPacketsSceneQuery();
    const rateofReceivedPacketsData = getSceneQueryRunner(rateofReceivedPacketsQuery);

    // Rate of Transmitted Packets
    const rateofTransmittedPacketsQuery = GetRateofTransmittedPacketsSceneQuery();
    const rateofTransmittedPacketsData = getSceneQueryRunner(rateofTransmittedPacketsQuery);

    // Rate of Received Packets Dropped
    const rateofReceivedPacketsDroppedQuery = GetRateofReceivedPacketsDroppedSceneQuery();
    const rateofReceivedPacketsDroppedData = getSceneQueryRunner(rateofReceivedPacketsDroppedQuery);

    // Rate of Transmitted Packets Dropped
    const rateofTransmittedPacketsDroppedQuery = GetRateofTransmittedPacketsDroppedSceneQuery();
    const rateofTransmittedPacketsDroppedData = getSceneQueryRunner(rateofTransmittedPacketsDroppedQuery);

    const variables = getComputeResourcesVariables();

    const getScene = () => {
        pluginReporter.reportPageView("grafana_plugin_page_view", {
            reporter: "Scene.Drilldown.ComputeResources",
            refererer: "Scene.Main.WorkloadsScene",
            type: ReportType.PageView,
        });
        return new EmbeddedScene({
            $data: clusterData,
            $variables: new SceneVariableSet({
                variables: variables
            }),
            $behaviors: getBehaviorsForVariables(variables, pluginReporter),
            controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
            body: new SceneFlexLayout({
                direction: 'column',
                children: [
                    new SceneFlexItem({
                        $data: cpuUsageData,
                        width: '100%',
                        minHeight: '50%',
                        body: timeseriesViz.setTitle("CPU Usage").build()
                    }),
                    new SceneFlexItem({
                        $data: transformedCPUQuotaData,
                        width: '100%',
                        minHeight: '50%',
                        body: cpuQuotaViz.build()
                    }),
                    new SceneFlexItem({
                        $data: memoryUsageData,
                        width: '100%',
                        minHeight: '50%',
                        body: timeseriesViz.setTitle("Memory Usage").setUnit("bytes").build()
                    }),
                    new SceneFlexItem({
                        $data: memoryQuotaTransformedData,
                        width: '100%',
                        minHeight: '50%',
                        body: memoryQuotaViz.build()
                    }),
                    new SceneFlexItem({
                        $data: networkUsageTransformedData,
                        width: '100%',
                        minHeight: '50%',
                        body: networkUsageViz.build()
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        minHeight: '50%',
                        children: [
                            new SceneFlexItem({
                                $data: receiveBandwidthData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Receive Bandwidth").setUnit("bps").build()
                            }),
                            new SceneFlexItem({
                                $data: transmitBandwidthData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Transmit Bandwidth").setUnit("bps").build()
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        minHeight: '50%',
                        children: [
                            new SceneFlexItem({
                                $data: avgContainerBandwithReceivedData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Average Container Bandwidth by Pod: Received").setUnit("bps").build()
                            }),
                            new SceneFlexItem({
                                $data: avgContainerBandwithTransmittedData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Average Container Bandwidth by Pod: Transmitted").setUnit("bps").build()
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        minHeight: '50%',
                        children: [
                            new SceneFlexItem({
                                $data: rateofReceivedPacketsData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Rate of Received Packets").setUnit("pps").build()
                            }),
                            new SceneFlexItem({
                                $data: rateofTransmittedPacketsData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Rate of Transmitted Packets").setUnit("pps").build()
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        minHeight: '50%',
                        children: [
                            new SceneFlexItem({
                                $data: rateofReceivedPacketsDroppedData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Rate of Received Packets Dropped").setUnit("pps").build()
                            }),
                            new SceneFlexItem({
                                $data: rateofTransmittedPacketsDroppedData,
                                width: '50%',
                                body: timeseriesViz.setTitle("Rate of Transmitted Packets Dropped").setUnit("pps").build()
                            })
                        ]
                    })
                ],
            
            })
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
                pluginReporter.reportException("grafana_plugin_promdsvarchange_failed", {
                    reporter: "Scene.Drilldown.ComputeResources",
                    refererer: "Scene.Main.WorkloadsScene",
                    exception: e instanceof Error ? e : new Error(stringify(e)),
                    type: ReportType.Exception,
                    trigger: "cluster_change"
                  });
                throw new Error(stringify(e));
            }
          });
        
        // create cluster mappings when scene loads
        const clusterDataSub = clusterData.subscribeToState((state) => {
        if (state.data?.state === "Done") {
          const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
          const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
          try {
                clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values);
                const selectedCluster = clusterVar.state.value.toString();
                const promDs = getPromDatasource(clusterMappings, selectedCluster);
                if (!!promDs && promDs.uid) {
                    promDSVar.changeValueTo(promDs.uid);
                } 
            } catch (e) {
              pluginReporter.reportException("grafana_plugin_createclustermappings_failed", {
                  reporter: "Scene.Drilldown.ComputeResources",
                  refererer: "Scene.Main.WorkloadsScene",
                  exception: e instanceof Error ? e : new Error(stringify(e)),
                  type: ReportType.Exception,
                  trigger: "cluster_data_change"
                });
            throw new Error(stringify(e));
          }
        }
      });
        return () => {
          clusterVarSub?.unsubscribe();
          clusterDataSub?.unsubscribe();
        }
      });
    return scene;
}

export function getComputeResourcesDrilldownPage(_: SceneRouteMatch<{}>, parent: SceneAppPageLike, pluginReporter: Reporter) {
  
    return new SceneAppPage({
      // Set up a particular namespace drill-down URL
      url: prefixRoute(`${ROUTES.Workloads}/${ROUTES.ComputeResources}`),
      // Important: Set this up for breadcrumbs to be built
      getParentPage: () => parent,
      title: `Compute Resources`,
      getScene: () => getComputeResourcesDrilldownScene(pluginReporter),
      drilldowns: [
        {
            routePath: prefixRoute(`${ROUTES.Workloads}/${ROUTES.ComputeResources}/${ROUTES.PodsDrilldown}`),
            getPage: (routeMatch, parent) => getPodWithLogsDrillDownPage(routeMatch, parent, pluginReporter)
        }
      ]
    });
}
