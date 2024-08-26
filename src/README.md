# Azure Cloud Native Monitoring

## Overview

![Homepage](https://github.com/user-attachments/assets/90148f4c-c3ad-4cb5-9fe3-076de7827ffd)

This Grafana App Plugin provides a seamless and enhanced monitoring experience for Azure Kubernetes Service (AKS) users. It integrates Azure, AKS, and Prometheus to offer a comprehensive view of your AKS environment.

**Simplified User Experience**: Users can access fully populated charts and experiences by selecting the cluster of interest. The plugin reduces the number of user inputs required, automatically discovering and populating variables such as Prometheus datasource and Log Analytics workspace.

**Granular Monitoring**: It displays monitoring data at various levels of granularity, from multi-cluster to individual containers, allowing users to drill down into specific areas of interest.

**Curated Azure Monitoring**: The plugin provides a curated Azure monitoring experience within Grafana, making it available in the public Grafana catalog and compatible with various Grafana platforms.

**Enhanced Troubleshooting**: It improves the AKS troubleshooting experience by providing better navigation, a range of supported visualizations, and keeping users in the same context.

## Requirements

This plugin works with Azure Monitor Datasource and Prometheus datasource configured with the Azure Monitor managed service for Prometheus. Please make sure you have configured in your instance:

- [Azure Monitor Datasource](https://grafana.com/docs/grafana/latest/datasources/azure-monitor/#azure-monitor-data-source)
- [Prometheus Datasource](https://grafana.com/docs/grafana/latest/getting-started/get-started-grafana-prometheus/) with [Azure Monitor managed service](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-metrics-overview)

## Getting started
If this plugin has not yet been enabled on your Grafana instance, Click on Install then Enable. This will automatically add an entry point on your Grafana navigation bar under Apps

![Grafana Navigation Bar](https://github.com/user-attachments/assets/eb52dc9a-5323-412f-a388-5909a4c06240)

Simply click on it and start your troubleshooting journey!

If you are self hosting your Grafana instance and would like to see the plugin as a root item in your navidation menu, you need to add the following config in your `grafana.ini` file.

```
[navigation.app_sections]
azure-cloudnativemonitoring-app = "root"
```

## Contributing

Please go to our [repo](https://github.com/microsoft/AzureMonitor-Grafana) to learn more about how to contribute

If you would like to report an issue or provide feedback, please open a [github issue](https://github.com/microsoft/AzureMonitor-Grafana/issues)