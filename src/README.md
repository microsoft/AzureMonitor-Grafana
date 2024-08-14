<!--=========================TODO=============================
======================================================================================
add screenshots here once they have been uploaded to github and a URL can be used for reference
======================================================================================
====================================================================================-->
# Azure Cloud Native Monitoring

## Overview

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
If this plugin has not yet been enabled on your Grafana instance, Click on Install then Enable. This will automatically add an entry point on your Grafana navigation bar


Simply click on it and start your troubleshooting journey!