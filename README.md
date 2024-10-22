# Grafana Azure Cloud Native Monitoring

[![Releases Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmicrosoft%2FAzureMonitor-Grafana%2Freleases%2Flatest&query=%24.name&label=version&color=green&link=https%3A%2F%2Fgithub.com%2Fmicrosoft%2FAzureMonitor-Grafana%2Freleases)](https://github.com/microsoft/AzureMonitor-Grafana/releases)
![Preview Badge](https://img.shields.io/badge/preview-blue)

A Grafana cloud-native app plugin designed to enhance monitoring capabilities.

-----------------------------------------------------------------

## Overview

This Grafana App Plugin provides a seamless and enhanced monitoring experience for Azure Kubernetes Service (AKS) users. It integrates Azure, AKS, and Prometheus to offer a comprehensive view of your AKS environment.

This plugin has a dependence on users having configured Azure Monitor and Prometheus plugin with the Azure Monitor managed service for Prom.

### Key Features

**Simplified User Experience**: Users can access fully populated charts and experiences by selecting the cluster of interest. The plugin reduces the number of user inputs required, automatically discovering and populating variables such as Prometheus datasource and Log Analytics workspace.

**Granular Monitoring**: It displays monitoring data at various levels of granularity, from multi-cluster to individual containers, allowing users to drill down into specific areas of interest.

**Curated Azure Monitoring**: The plugin provides a curated Azure monitoring experience within Grafana, making it available in the public Grafana catalog and compatible with various Grafana platforms.

**Enhanced Troubleshooting**: It improves the AKS troubleshooting experience by providing better navigation, a range of supported visualizations, and keeping users in the same context.

### Benefits

- Reduces the cognitive load for users by minimizing the information they need to know to start their troubleshooting journey.
- Supports a wider range of visualizations using Grafana scenes

The Grafana App Plugin for AKS Monitoring is a powerful tool that simplifies and enhances the monitoring experience for AKS users. It leverages the strengths of Azure, AKS, and Prometheus to provide a unified and detailed view of the clusters, facilitating better decision-making and troubleshooting.



<!-----------------------[  Getting Started  ]--------------<recommended> section below------------------>
## Getting Started

This plugin will be shipped as part of Grafana's [plugin catalog](https://grafana.com/grafana/plugins/). You may find our plugin here [placeholder for plugin link once shipped]()


<!-----------------------[ Prerequisites  ]-----------------<optional> section below--------------------->
### Prerequisites

- A Grafana instance running on 10.4+
- An Azure Monitor datasource configured with the right access to your AKS clusters
- A Prometheus datasource configured with the Azure Monitor Workspace that has been onboarded to monitor your clusters.

<!-----------------------[  Installing  ]-------------------<optional> section below------------------>
### Installing

You may use our plugin locally through cloning this repo onto your machine, or by installing it directly in your Grafana instance. Please follow the instructions below based on the scenario that best fits your needs.

#### Grafana Instance
Note that you will need the right permissions on your Grafana instance in order to install plugins. To learn more about these, please take a look at [Grafana Roles](https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/#:~:text=Grafana%20uses%20the%20following%20roles%20to%20control%20user,Permissions%20will%20be%20added%20with%20RBAC%20as%20needed.). Role permissions may vary by org, please check with your instance Admin to figure out what you need to install this plugin.

In your Grafana instance:
1. Navigate to *Administration* > *Plugins and Data* > *Plugins*
1. Toggle *State* to *All*
1. Search for Azure Cloud Native Monitoring and click install

#### Locally
Please see [CONTRIBUTING.md](./CONTRIBUTING.md)

<!-----------------------[  Deployment (CI/CD)  ]-----------<optional> section below--------------------->
### Deployment (CI/CD)

This Repo will be leveraing Azure Devops Pipelines for deployment

-----------------------------------------------


<!-----------------------[  Contributing  ]-----------------<recommended> section below------------------>
## Contributing

_This repository prefers outside contributors start forks rather than branches. Pull requests that do not come from a forked repo, will not be reviewed_

Before creating a Pull Request, please make sure you have opened a github issue that goes over what you are trying to do and whether it is a bug fix or a new feature. The github issue should be linked on the PR
 
### Support & Reuse Expectations

_The creators of this repository **DO NOT EXPECT REUSE**._

If you do use it, please leave a note in an issue, so we can best understand the value of this repository.

--------------------------------------------
