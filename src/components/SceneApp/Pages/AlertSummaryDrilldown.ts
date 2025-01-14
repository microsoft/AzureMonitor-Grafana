import { EmbeddedScene, SceneAppPage, SceneAppPageLike, SceneFlexItem, SceneFlexLayout, SceneRefreshPicker, SceneRouteMatch, SceneTimePicker, SceneVariableSet, VariableValueSelectors } from "@grafana/scenes";
import { Reporter } from "reporter/reporter";
import { GetPlatformAlertSumary, GetPromAlertsSummary, GetSummaryDetailsSceneQuery, GetTotalAlertsSummary } from "../Queries/AlertSumQueries";
import { getStatViz, getTableVisualizationAlertSummaryDetails } from "../Visualizations/AlertSummaryViz";
import { getBehaviorsForVariables, getSharedSceneVariables } from "./sceneUtils";
import { getSceneURL } from "../Queries/dataUtil";

function getAlertSummaryDrilldownScene(namespace: string, pluginReporter: Reporter) {
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

    const variables = getSharedSceneVariables(true);
    return new EmbeddedScene({
        $variables: new SceneVariableSet({
            variables: variables,
        }),
        $behaviors: getBehaviorsForVariables(variables, pluginReporter),
        controls: [new VariableValueSelectors({}), new SceneTimePicker({}), new SceneRefreshPicker({})],
        body: new SceneFlexLayout({
            direction: 'column',
            children: [
                new SceneFlexLayout({
                    direction: 'row',
                    minHeight: "25%",
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
                    minHeight: 500,
                    $data: alertSummaryDetailsData,
                    body: tableViz.build(),
                }),
          ],
        }),
      });
}

export function getAlertSummaryDrilldownPage(routeMatch: SceneRouteMatch<{ namespace: string }>, parent: SceneAppPageLike, sourcePage: string, pluginReporter: Reporter) {
    // Retrieve namespace and sub from the URL params
    const namespace = decodeURIComponent(routeMatch.params.namespace);
    return new SceneAppPage({
      // Set up a particular namespace drill-down URL
      url: getSceneURL(`${sourcePage}/alertsummary/${encodeURIComponent(namespace)}`),
      // Important: Set this up for breadcrumbs to be built
      getParentPage: () => parent,
      title: `Alert Summary for namespace ${namespace}`,
      getScene: () => getAlertSummaryDrilldownScene(namespace, pluginReporter).clone(),
    });
}
