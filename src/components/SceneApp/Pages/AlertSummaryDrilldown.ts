import { SceneRouteMatch, SceneAppPageLike, SceneAppPage, EmbeddedScene, SceneFlexItem, SceneFlexLayout, SceneTimeRange, SceneVariableSet, VariableValueSelectors, SceneTimePicker, SceneRefreshPicker } from "@grafana/scenes";
import { GetSummaryDetailsSceneQuery, GetTotalAlertsSummary, GetPromAlertsSummary, GetPlatformAlertSumary } from "../Queries/AlertSumQueries";
import { getStatPlatformAlerts, getStatPromAlerts, getStatTotalAlerts, getTableVisualizationAlertSummaryDetails } from "../Visualizations/AlertSummaryViz";
import { getSharedSceneVariables } from "./sceneUtils";

function getAlertSummaryDrilldownScene(namespace: string) {
    // alertDetails 
    const alertSummaryDetailsData = GetSummaryDetailsSceneQuery(namespace);
    const tableViz = getTableVisualizationAlertSummaryDetails();

    // total alerts summary
    const totalAlertsSummary = GetTotalAlertsSummary(namespace);
    const totalAlertsStatViz = getStatTotalAlerts();

    // prom alerts summary
    const promAlertsSummary = GetPromAlertsSummary(namespace);
    const promAlertsStatViz = getStatPromAlerts();

    // platform alerts summary
    const platformAlertsSummary = GetPlatformAlertSumary(namespace);
    const platformAlertsStatViz = getStatPlatformAlerts();

    return new EmbeddedScene({
        $variables: new SceneVariableSet({
            variables: getSharedSceneVariables(true),
        }),
        controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
        $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
        body: new SceneFlexLayout({
            direction: 'column',
            children: [
                new SceneFlexLayout({
                    direction: 'row',
                    height: "15%",
                    children: [
                        new SceneFlexItem({
                            $data: totalAlertsSummary,
                            body: totalAlertsStatViz.build(),
                            width: "25%",
                            height: "100%",
                        }),
                        new SceneFlexItem({
                            $data: promAlertsSummary,
                            body: promAlertsStatViz.build(),
                            width: "25%",
                            height: "100%",
                        }),
                        new SceneFlexItem({
                            $data: platformAlertsSummary,
                            body: platformAlertsStatViz.build(),
                            width: "25%",
                            height: "100%",
                        }),
                    ]
                }),
                new SceneFlexItem({
                    $data: alertSummaryDetailsData,
                    body: tableViz.build(),
                }),
          ],
        }),
      });
}

export function getAlertSummaryDrilldownPage(routeMatch: SceneRouteMatch<{ namespace: string }>, parent: SceneAppPageLike, sourcePage: string) {
    // Retrieve namespace and sub from the URL params
    const namespace = decodeURIComponent(routeMatch.params.namespace);
    return new SceneAppPage({
      // Set up a particular namespace drill-down URL
      url: `/a/azure-azurekubernetesmonitoring-app/clusternavigation/${sourcePage}/alertsummary/${encodeURIComponent(namespace)}`,
      // Important: Set this up for breadcrumbs to be built
      getParentPage: () => parent,
      title: `Alert Summary for namespace ${namespace}`,
      getScene: () => getAlertSummaryDrilldownScene(namespace).clone(),
    });
}