import { EmbeddedScene, SceneAppPage, SceneAppPageLike, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneRouteMatch, SceneTimePicker, SceneTimeRange, SceneVariableSet, VariableValueSelectors } from "@grafana/scenes";
import { GetPlatformAlertSumary, GetPromAlertsSummary, GetSummaryDetailsSceneQuery, GetTotalAlertsSummary } from "../Queries/AlertSumQueries";
import { getStatViz, getTableVisualizationAlertSummaryDetails } from "../Visualizations/AlertSummaryViz";
import { getSharedSceneVariables } from "./sceneUtils";
import { AZURE_MONITORING_PLUGIN_ID } from "../../../constants";

function getAlertSummaryDrilldownScene(namespace: string) {
    // alertDetails 
    const alertSummaryDetailsData = GetSummaryDetailsSceneQuery(namespace);
    const tableViz = getTableVisualizationAlertSummaryDetails();

    // total alerts summary
    const totalAlertsSummary = GetTotalAlertsSummary(namespace);
    const totalAlertsStatViz = getStatViz("Total Alerts", "No fired alerts found", "semi-dark-red", "A");

    // prom alerts summary
    const promAlertsSummary = GetPromAlertsSummary(namespace);
    const promAlertsStatViz = getStatViz("Prometheus", "No fired Prom alerts found", "semi-dark-green", "A");

    // platform alerts summary
    const platformAlertsSummary = GetPlatformAlertSumary(namespace);
    const platformAlertsStatViz = getStatViz("Platform", "No fired Platform alerts found", "semi-dark-orange", "A");

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
                    height: "25%",
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
                    height: 500,
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
      url: `/a/${AZURE_MONITORING_PLUGIN_ID}/clusternavigation/${sourcePage}/alertsummary/${encodeURIComponent(namespace)}`,
      // Important: Set this up for breadcrumbs to be built
      getParentPage: () => parent,
      title: `Alert Summary for namespace ${namespace}`,
      getScene: () => getAlertSummaryDrilldownScene(namespace).clone(),
    });
}
