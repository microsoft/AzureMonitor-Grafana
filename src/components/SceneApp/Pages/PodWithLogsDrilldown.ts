import { DataSourceVariable, EmbeddedScene, PanelBuilders, QueryVariable, SceneAppPage, SceneAppPageLike, SceneFlexItem, SceneFlexLayout, SceneQueryRunner, SceneRefreshPicker, SceneRouteMatch, SceneTimePicker, SceneVariableSet, VariableValueSelectors, sceneGraph } from "@grafana/scenes";
import { GraphThresholdsStyleMode, ThresholdsMode } from "@grafana/schema";
import { TelemetryClient } from "telemetry/telemetry";
import { ReportType } from "telemetry/types";
import { ClusterMapping } from "types";
import { stringify } from "utils/stringify";
import { AZURE_MONITORING_PLUGIN_ID, CLUSTER_VARIABLE, NS_VARIABLE, POD_VAR, PROM_DS_VARIABLE, WORKLOAD_VAR } from "../../../constants";
import { GetClustersQuery } from "../Queries/ClusterMappingQueries";
import { GetCPUQuotaQueries, GetCPUThrottlingQueries, GetCPUUsageQuery, GetCurrentStorageIOQueries, GetIOPSQueries, GetIOPSRWQueries, GetLASceneQueryFor, GetMemoryQuotaQueries, GetMemoryUsageQueries, GetRateQueriesFor, GetThroughputQueries, GetThrouputQueries, TransformCPUQuotaData, TransformCPUUsageData, TransformCurrentStorageData, TransformMemoryQuotaData } from "../Queries/PodWithLogsQueries";
import { azure_monitor_queries } from "../Queries/queries";
import { createMappingFromSeries, getSceneQueryRunner } from "../Queries/queryUtil";
import { getPrometheusVariable } from "../Variables/variables";
import { applyOverridesCPUUsage, getTableVizCPUQuota, getTableVizCurrentStorage, getTableVizMemoryQuota, getTimeSeriesViz } from "../Visualizations/PodsWithLogsViz";
import { getThresholdsConfig } from "../Visualizations/utils";
import { getBehaviorsForVariables, getSharedSceneVariables } from "./sceneUtils";

function getPodWithLogsVariables() {
    const variables = getSharedSceneVariables(true);
    const namespaceVariableRaw = `label_values(namespace_workload_pod:kube_pod_owner:relabel{workload=~\"\${${WORKLOAD_VAR}}\"},namespace)`;
    const podVariableRaw = `label_values(kube_pod_info{job=\"kube-state-metrics\", cluster=\"\$${CLUSTER_VARIABLE}\", namespace=\"\$${NS_VARIABLE}\"}, pod)`;
    variables.push(getPrometheusVariable(NS_VARIABLE, "Namespace", namespaceVariableRaw));
    variables.push(getPrometheusVariable(POD_VAR, "Pod", podVariableRaw));

    return variables;
}

function getPodWithLogsDrilldownScene(telemetryClient: TelemetryClient) {
    // get cluster data and initialize mappings
    const clusterData = GetClustersQuery(azure_monitor_queries['clustersQuery']);
    let clusterMappings: Record<string, ClusterMapping> = {};

    // kubernetes warning events
    const kubeWarningEventsData = new SceneQueryRunner({ queries: [] });

    // syslog emergency
    const syslogEmergencyData   = new SceneQueryRunner({ queries: [] });
    // syslog alert
    const syslogAlertData       = new SceneQueryRunner({ queries: [] });
    // syslog errors
    const syslogErrorsData      = new SceneQueryRunner({ queries: [] });
    // syslog warning
    const syslogWarningData     = new SceneQueryRunner({ queries: [] });
    // syslog critical
    const syslogCriticalData    = new SceneQueryRunner({ queries: [] });

    // CPU Usage
    const cpuUsageQueries = GetCPUUsageQuery();
    const cpuUsageData = getSceneQueryRunner(cpuUsageQueries);
    const transformCPUUsageData = TransformCPUUsageData(cpuUsageData);
    const cpuUsageTimeSeries = getTimeSeriesViz("CPU Usage", 0, 2, "short", undefined, undefined, undefined);
    applyOverridesCPUUsage(cpuUsageTimeSeries);

    // syslog critical
    const kubeEventsForPodData    = new SceneQueryRunner({ queries: [] });

    // CPU Throttling
    const cpuThrottlingQueries = GetCPUThrottlingQueries();
    const cpuThrottlingData = getSceneQueryRunner(cpuThrottlingQueries);
    const cpuThrottlingThresholds = getThresholdsConfig(ThresholdsMode.Absolute, {0: "transparent", 0.25: "red"});
    const cpuThrottlingViz = getTimeSeriesViz("CPU Throttling", 100, 0,  "percentunit", 1, cpuThrottlingThresholds, GraphThresholdsStyleMode.LineAndArea);

    // Container Logs for pods
    const podContainerLogsData    = new SceneQueryRunner({ queries: [] });

    // CPU Quota
    const cpuQuotaQueries = GetCPUQuotaQueries();
    const cpuQuotaData = getSceneQueryRunner(cpuQuotaQueries);
    const tranformedCPUQuotaData = TransformCPUQuotaData(cpuQuotaData);
    const cpuQuotaTimeSeriesViz = getTableVizCPUQuota();

    // Memory Usage
    const memoryUsageQueries = GetMemoryUsageQueries();
    const memoryUsageData = getSceneQueryRunner(memoryUsageQueries);
    const memoryUsageTimeSeries = getTimeSeriesViz("Memory Usage (WSS)", 100, 0,  "bytes", undefined, undefined, undefined);

    // Memory Quota
    const memoryQuotaQueries = GetMemoryQuotaQueries();
    const memoryQuotaData = getSceneQueryRunner(memoryQuotaQueries);
    const transformedMemoryQuotaData = TransformMemoryQuotaData(memoryQuotaData);
    const tableVizMemoryQuota = getTableVizMemoryQuota();

    // Receieve Bandwith
    const receiveBandwidthQueries = GetRateQueriesFor("container_network_receive_bytes_total");
    const receiveBandwithData = getSceneQueryRunner(receiveBandwidthQueries);
    const receiveBandwithViz = getTimeSeriesViz("Receive Bandwidth", 100, 0,  "Bps", undefined, undefined, undefined);

    // Transmit Bandwith
    const transmitBandwidthQueries = GetRateQueriesFor("container_network_transmit_bytes_total");
    const transmitBandwidthData = getSceneQueryRunner(transmitBandwidthQueries);
    const transmitBandwithViz = getTimeSeriesViz("Transmit Bandwidth", 100, 0,  "Bps", undefined, undefined, undefined);

    // received Packets
    const receivedPacketsQueries = GetRateQueriesFor("container_network_receive_packets_total");
    const receivedPacketsData = getSceneQueryRunner(receivedPacketsQueries);
    const receivedPacketsViz = getTimeSeriesViz("Received Packets", 100, 0,  "pps", undefined, undefined, undefined);

    // transmitted Packets
    const transmittedPacketsQueries = GetRateQueriesFor("container_network_transmit_packets_total");
    const transmittedPacketsData = getSceneQueryRunner(transmittedPacketsQueries);
    const transmittedPacketsViz = getTimeSeriesViz("Transmitted Packets", 100, 0,  "pps", undefined, undefined, undefined);


    // receieved  Packets dropped
    const receivedPacketsDroppedQueries = GetRateQueriesFor("container_network_receive_packets_dropped_total");
    const receivedPacketsDroppedData = getSceneQueryRunner(receivedPacketsDroppedQueries);
    const receivedPacketsDroppedViz = getTimeSeriesViz("Rate of Received Packets Dropped", 100, 0,  "pps", undefined, undefined, undefined);

    // transmitted Packets Dropped
    const transmittedPacketsDroppedQueries = GetRateQueriesFor("container_network_transmit_packets_dropped_total");
    const transmittedPacketsDroppedData = getSceneQueryRunner(transmittedPacketsDroppedQueries);
    const transmittedPacketsDroppedViz = getTimeSeriesViz("Rate of Transmitted Packets Dropped", 100, 0,  "pps", undefined, undefined, undefined);

    // IOPS
    const iopsQueries = GetIOPSQueries();
    const iopsData = getSceneQueryRunner(iopsQueries);
    const iopsViz = getTimeSeriesViz("IOPS", 100, 0,  "short", undefined, undefined, undefined);

    // throughput
    const throughputQueries = GetThrouputQueries();
    const throughputData = getSceneQueryRunner(throughputQueries);
    const throughputViz = getTimeSeriesViz("Throughput", 100, 0,  "Bps", undefined, undefined, undefined);

    // IOPS RW
    const iopsRWQueries = GetIOPSRWQueries();
    const iopsRWData = getSceneQueryRunner(iopsRWQueries);
    const iopsRWViz = getTimeSeriesViz("IOPS(Reads+Writes)", 100, 0,  "short", undefined, undefined, undefined);

    // Throughput RW 
    const throughputRWQueries = GetThroughputQueries();
    const throughputRWData = getSceneQueryRunner(throughputRWQueries);
    const throughputRWViz = getTimeSeriesViz("ThroughPut(Read+Write)", 100, 0,  "Bps", undefined, undefined, undefined);


    // current Storage IO
    const currentStorageIOQueries = GetCurrentStorageIOQueries();
    const currentStorageIOData = getSceneQueryRunner(currentStorageIOQueries);
    const currentStorageTransformedData = TransformCurrentStorageData(currentStorageIOData);
    const currentStorageViz = getTableVizCurrentStorage();

    const variables = getPodWithLogsVariables();
    const getScene = () => new EmbeddedScene({
        $data: clusterData,
        $variables: new SceneVariableSet({
            variables: variables,
        }),
        $behaviors: getBehaviorsForVariables(variables, telemetryClient),
        controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
        body: new SceneFlexLayout({
          children: [
            new SceneFlexLayout({
                direction: "column",
                children: [
                    new SceneFlexItem({
                      width: '100%',
                      height: 100,
                      body: PanelBuilders.text().setTitle("").setOption('content', `Kubernetes Events & Container Logs`).build(),
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: kubeWarningEventsData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Kubernetes Warning Events").build()
                            }),
                            new SceneFlexItem({
                                $data: syslogEmergencyData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Syslog Emergency").build(),
                            }),
                            new SceneFlexItem({
                                $data: syslogAlertData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Syslog Alert").build(),
                            }),
                            new SceneFlexItem({
                                $data: syslogErrorsData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Syslog Errors").build(),
                            }),
                            new SceneFlexItem({
                                $data: syslogWarningData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Syslog Warning").build(),
                            }),
                            new SceneFlexItem({
                                $data: syslogCriticalData,
                                width: '16.6%',
                                height: 200,
                                body: PanelBuilders.stat().setTitle("Syslog Critical").build(),
                            }),
                        ]
                    }),
                    new SceneFlexItem({
                        width: '100%',
                        height: 100,
                        body: PanelBuilders.text().setTitle("").setOption('content', `CPU Usage`).build(),
                    }),
                    new SceneFlexItem({
                        $data: transformCPUUsageData,
                        width: '100%',
                        height: 300,
                        body: cpuUsageTimeSeries.build(),
                    }),
                    new SceneFlexItem({
                        $data: kubeEventsForPodData,
                        width: '100%',
                        height: 500,
                        body: PanelBuilders.logs().setOption("showTime", true).setTitle("Kubernetes Events for pod").build(),
                    }),
                    new SceneFlexItem({
                        width: '100%',
                        height: 100,
                        body: PanelBuilders.text().setTitle("").setOption('content', `CPU Throttling`).build(),
                    }),
                    new SceneFlexItem({
                        $data: cpuThrottlingData,
                        width: '100%',
                        height: 300,
                        body: cpuThrottlingViz.build(),
                    }),
                    new SceneFlexItem({
                        $data: podContainerLogsData,
                        width: '100%',
                        height: 500,
                        body: PanelBuilders.logs().setOption("showTime", true).setTitle("Container Logs for pods").setDescription("This panel only works with analytics tables, and will fail if your ContainerLogV2 table is set to basic in your workspace").build(),
                    }),
                    new SceneFlexItem({
                        width: '100%',
                        height: 100,
                        body: PanelBuilders.text().setTitle("").setOption('content', `CPU Quota`).build(),
                    }),
                    new SceneFlexItem({
                        $data: tranformedCPUQuotaData,
                        width: '100%',
                        height: 300,
                        body: cpuQuotaTimeSeriesViz.build(),
                    }),
                    new SceneFlexItem({
                        $data: memoryUsageData,
                        width: '100%',
                        height: 300,
                        body: memoryUsageTimeSeries.build(),
                    }),
                    new SceneFlexItem({
                        $data: transformedMemoryQuotaData,
                        width: '100%',
                        height: 300,
                        body: tableVizMemoryQuota.build(),
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: receiveBandwithData,
                                width: '50%',
                                height: 300,
                                body: receiveBandwithViz.build(),
                            }),
                            new SceneFlexItem({
                                $data: transmitBandwidthData,
                                width: '50%',
                                height: 300,
                                body: transmitBandwithViz.build(),
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: receivedPacketsData,
                                width: '50%',
                                height: 300,
                                body: receivedPacketsViz.build(),
                            }),
                            new SceneFlexItem({
                                $data: transmittedPacketsData,
                                width: '50%',
                                height: 300,
                                body: transmittedPacketsViz.build(),
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: receivedPacketsDroppedData,
                                width: '50%',
                                height: 300,
                                body: receivedPacketsDroppedViz.build(),
                            }),
                            new SceneFlexItem({
                                $data: transmittedPacketsDroppedData,
                                width: '50%',
                                height: 300,
                                body: transmittedPacketsDroppedViz.build(),
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: iopsData,
                                width: '50%',
                                height: 300,
                                body: iopsViz.build(),
                            }),
                            new SceneFlexItem({
                                $data: throughputData,
                                width: '50%',
                                height: 300,
                                body: throughputViz.build(),
                            }),
                        ]
                    }),
                    new SceneFlexLayout({
                        direction: 'row',
                        children: [
                            new SceneFlexItem({
                                $data: iopsRWData,
                                width: '50%',
                                height: 300,
                                body: iopsRWViz.build(),
                            }),
                            new SceneFlexItem({
                                $data: throughputRWData,
                                width: '50%',
                                height: 300,
                                body: throughputRWViz.build(),
                            }),
                        ]
                    }),
                    new SceneFlexItem({
                        $data: currentStorageTransformedData,
                        width: '100%',
                        height: 300,
                        body: currentStorageViz.build(),
                    }),
                ]
            })
          ],
        }),
      });

      telemetryClient.reportPageView("grafana_plugin_page_view", {
        reporter: "Scene.Drilldown.PodWithLogs",
        refererer: "Scene.Drilldown.ComputeResources",
        type: ReportType.PageView,
        });
      const scene = getScene();
      scene.addActivationHandler(() => {
        const promDSVar = sceneGraph.lookupVariable(PROM_DS_VARIABLE, scene) as DataSourceVariable;
        const clusterVar = sceneGraph.lookupVariable(CLUSTER_VARIABLE, scene) as QueryVariable;
        const clusterVarSub = clusterVar.subscribeToState((state) => {
            if (!!state.value) {
                const selectedCluster = state.value.toString();
                try {
                    const newPromDs = clusterMappings[selectedCluster]?.promDs;
                    if (!!newPromDs && newPromDs.uid) {
                        promDSVar.changeValueTo(newPromDs.uid);
                    }
                } catch (e) {
                    telemetryClient.reportException("grafana_plugin_promdsvarchange_failed", {
                        reporter: "Scene.Drilldown.PodWithLogs",
                        refererer: "Scene.Drilldown.ComputeResources",
                        exception: "e instanceof Error ? e : new Error(stringify(e))",
                        type: ReportType.Exception,
                        trigger: "cluster_change"
                      });
                    throw new Error(stringify(e));
                }
            }
        });
        const clusterDataSub = clusterData.subscribeToState((state) => {
            if (state.data?.state === "Done") {
                const workspaceData = state.data?.series.filter((s) => s.refId === "workspaces");
                const clusterData = state.data?.series.filter((s) => s.refId === "clusters");
                clusterMappings = createMappingFromSeries(workspaceData[0]?.fields[0]?.values, workspaceData[0]?.fields[1]?.values, clusterData[0]?.fields[0]?.values, clusterData[0]?.fields[1]?.values, clusterData[0]?.fields[2]?.values);

                // once the cluster mappings are fetched, run all the queries
                const kubeWarningEventsQueries = GetLASceneQueryFor("KubeWarningEvents", clusterVar.getValue().toString(), clusterMappings, "table", undefined);
                const syslogEmergencyQueries = GetLASceneQueryFor("SysLog", clusterVar.getValue().toString(), clusterMappings, "table", "emergency");
                const syslogAlertQueries = GetLASceneQueryFor("SysLog", clusterVar.getValue().toString(), clusterMappings, "table", "alert");
                const syslogErrorsQueries = GetLASceneQueryFor("SysLog", clusterVar.getValue().toString(), clusterMappings, "table", "error");
                const syslogWarningQueries = GetLASceneQueryFor("SysLog", clusterVar.getValue().toString(), clusterMappings, "table", "warning");
                const syslogCriticalQueries = GetLASceneQueryFor("SysLog", clusterVar.getValue().toString(), clusterMappings, "table", "critical");
                const kubeEventsPodQueries = GetLASceneQueryFor("KubeEventsPods", clusterVar.getValue().toString(), clusterMappings, "logs", undefined);
                const podContainerLogsQueries = GetLASceneQueryFor("ContainerLogs", clusterVar.getValue().toString(), clusterMappings, "logs", undefined);

                try {
                    if (!!kubeWarningEventsQueries) {
                        kubeWarningEventsData.setState({ queries: [kubeWarningEventsQueries] });
                        kubeWarningEventsData.runQueries();
                    }
    
                    if (!!syslogEmergencyQueries) {
                        syslogEmergencyData.setState({ queries: [syslogEmergencyQueries] });
                        syslogEmergencyData.runQueries();
                    }
    
                    if (!!syslogAlertQueries) {
                        syslogAlertData.setState({ queries: [syslogAlertQueries] });
                        syslogAlertData.runQueries();
                    }
    
                    if (!!syslogErrorsQueries) {
                        syslogErrorsData.setState({ queries: [syslogErrorsQueries] });
                        syslogErrorsData.runQueries();
                    }
    
                    if (!!syslogWarningQueries) {
                        syslogWarningData.setState({ queries: [syslogWarningQueries] });
                        syslogWarningData.runQueries();
                    }
    
                    if (!!syslogCriticalQueries) {
                        syslogCriticalData.setState({ queries: [syslogCriticalQueries] });
                        syslogCriticalData.runQueries();
                    }
    
                    if (!!kubeEventsPodQueries) {
                        kubeEventsForPodData.setState({ queries: [kubeEventsPodQueries] });
                        kubeEventsForPodData.runQueries();
                    }
    
                    if (!!podContainerLogsQueries) {
                        podContainerLogsData.setState({ queries: [podContainerLogsQueries] });
                        podContainerLogsData.runQueries();
                    }
                } catch (e) {
                    telemetryClient.reportException("grafana_plugin_runqueries_failed", {
                        reporter: "Scene.Drilldown.PodWithLogs",
                        refererer: "Scene.Drilldown.ComputeResources",
                        exception: e instanceof Error ? e : new Error(stringify(e)),
                        type: ReportType.Exception,
                        trigger: "cluster_mappings_change"
                      });
                    throw new Error(stringify(e));
                }
            }
        });

        return () => {
            clusterVarSub.unsubscribe();
            clusterDataSub.unsubscribe();
        }
      });

      return scene
}

export function getPodWithLogsDrillDownPage(_: SceneRouteMatch<{}>, parent: SceneAppPageLike, telemetryClient: TelemetryClient) {
    return new SceneAppPage({
        url: `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/workload/computeresources/pods/logs/drilldown`,
        title: `Pod with Logs`,
        getScene: () => getPodWithLogsDrilldownScene(telemetryClient),
        getParentPage: () => parent,
    });
}
