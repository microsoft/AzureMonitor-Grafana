import { SceneDataTransformer, SceneQueryRunner } from "@grafana/scenes";
import { getAzureResourceGraphQuery } from "./queryUtil";
import { CLUSTER_VARIABLE, SUBSCRIPTION_VARIABLE } from "../../../constants";



export function GetSummaryDetailsSceneQuery(namespace: string) {
    const rawQuery = `alertsmanagementresources\r\n| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' and todatetime(properties.essentials.lastModifiedDateTime) >= $__timeFrom and todatetime(properties.essentials.lastModifiedDateTime) <= $__timeTo | project SubName=name, subscriptionId) on subscriptionId\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| where tolower(subscriptionId) == tolower(\${${SUBSCRIPTION_VARIABLE}}) and  tostring(properties.context.labels.namespace) in~ (\"${namespace}\") and tostring(properties.context.labels.cluster) in~ ('\${${CLUSTER_VARIABLE}}') \r\n| parse id with * \"alerts/\" alertId\r\n| project container = tostring(properties.context.labels.container),name, tostring(properties.essentials.severity),  tostring(properties.essentials.monitorCondition), \r\n tostring(properties.essentials.alertState), todatetime(properties.essentials.lastModifiedDateTime), tostring(properties.essentials.monitorService), alertId\r\n`;
    const query = {
        queries: [getAzureResourceGraphQuery(rawQuery, `\$${SUBSCRIPTION_VARIABLE}`, "A")],
    };
    const originalData = new SceneQueryRunner(query);
    const transformedData = new SceneDataTransformer({
        $data: originalData,
        transformations: [
            {
                id: "organize",
                options: {
                  excludeByName: {
                    Time: true,
                    Value: true,
                    cluster: true,
                    container: false,
                    container_id: true,
                    image: true,
                    image_id: true,
                    image_spec: true,
                    instance: true,
                    job: true,
                    name: false,
                    namespace: true,
                    pod: true,
                    uid: true,
                    workload_type: true
                  },
                  indexByName: {
                    alertId: 6,
                    container: 7,
                    name: 0,
                    properties_essentials_alertState: 3,
                    properties_essentials_lastModifiedDateTime: 4,
                    properties_essentials_monitorCondition: 2,
                    properties_essentials_monitorService: 5,
                    properties_essentials_severity: 1
                  },
                  renameByName: {
                    alertId: "Alert ID",
                    container: "Container",
                    name: "Name",
                    properties_essentials_alertState: "User Response",
                    properties_essentials_lastModifiedDateTime: "Fired Time",
                    properties_essentials_monitorCondition: "Alert Condition",
                    properties_essentials_monitorService: "Monitor Service",
                    properties_essentials_severity: "Severity"
                  }
                }
            }
        ]
    });

    return transformedData;
}

export function GetTotalAlertsSummary(namespace: string) {
    const rawQuery =  `alertsmanagementresources\r\n| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' | project SubName=name, subscriptionId) on subscriptionId\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| where tolower(subscriptionId) == tolower(\${${SUBSCRIPTION_VARIABLE}})  and  tostring(properties.context.labels.namespace) in~ (\"${namespace}\")  \r\n| parse id with * \"alerts/\" alertId\r\n| extend ruleType = properties.essentials.monitorService, cluster = properties.context.labels.cluster, namespace = tostring(properties.context.labels.namespace)\r\n| where  namespace == \"${namespace}\" and tolower(cluster) == tolower(tostring('\${${CLUSTER_VARIABLE}}'))\r\n| project container = tostring(properties.context.labels.container),name, tostring(properties.essentials.severity),  tostring(properties.essentials.monitorCondition), \r\n tostring(properties.essentials.alertState), todatetime(properties.essentials.lastModifiedDateTime), tostring(properties.essentials.monitorService), alertId\r\n| summarize count()`;
    const query = {
        queries: [getAzureResourceGraphQuery(rawQuery, `\$${SUBSCRIPTION_VARIABLE}`, "A")],
    };

    return new SceneQueryRunner(query);
}

export function GetPromAlertsSummary(namespace: string) {
    const rawQuery = `alertsmanagementresources\r\n| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' | project SubName=name, subscriptionId) on subscriptionId\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| where tolower(subscriptionId) == tolower(\${${SUBSCRIPTION_VARIABLE}}) and  tostring(properties.context.labels.namespace) in~ (\"${namespace}\") \r\n| parse id with * \"alerts/\" alertId\r\n| extend ruleType = properties.essentials.monitorService, cluster = properties.context.labels.cluster, namespace = tostring(properties.context.labels.namespace)\r\n| where  ruleType == \"Prometheus\" and namespace == \"${namespace}\" and tolower(cluster) == tolower(tostring('\${${CLUSTER_VARIABLE}}'))\r\n| project namespace,cluster,container = tostring(properties.context.labels.container),name, tostring(properties.essentials.severity),  tostring(properties.essentials.monitorCondition), \r\n tostring(properties.essentials.alertState), todatetime(properties.essentials.lastModifiedDateTime), tostring(properties.essentials.monitorService), alertId\r\n| summarize count()`;
    const query = {
        queries: [getAzureResourceGraphQuery(rawQuery, `\$${SUBSCRIPTION_VARIABLE}`, "A")],
    };
    return new SceneQueryRunner(query);
}

export function GetPlatformAlertSumary(namespace: string) {
    const rawQuery = `alertsmanagementresources\r\n| join kind=leftouter (ResourceContainers | where type=='microsoft.resources/subscriptions' | project SubName=name, subscriptionId) on subscriptionId\r\n| where type == \"microsoft.alertsmanagement/alerts\"\r\n| where (tolower(subscriptionId) == tolower(\${${SUBSCRIPTION_VARIABLE}}))\r\n| extend ruleType = properties.essentials.monitorService, cluster= properties.context.labels.cluster\r\n| where  ruleType == \"Platform\" and properties.context.labels.namespace in~ (\"${namespace}\") and tolower(cluster) == tolower(tostring('\${${CLUSTER_VARIABLE}}'))\r\n| project   Type =tostring(ruleType), AlertName = properties.context.labels.alertname,cluster = tostring(properties.context.labels.cluster) ,container = tostring(properties.context.labels.container),namespace = properties.context.labels.namespace ,pod = properties.context.labels.pod\r\n| summarize count()`
    const query = {
        queries: [getAzureResourceGraphQuery(rawQuery, `\$${SUBSCRIPTION_VARIABLE}`, "A")],
    };
    return new SceneQueryRunner(query);
}
