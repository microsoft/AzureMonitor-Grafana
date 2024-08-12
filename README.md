<!--=========================README TEMPLATE INSTRUCTIONS=============================
======================================================================================

- THIS README TEMPLATE LARGELY CONSISTS OF COMMENTED OUT TEXT. THIS UNRENDERED TEXT IS MEANT TO BE LEFT IN AS A GUIDE 
  THROUGHOUT THE REPOSITORY'S LIFE WHILE END USERS ONLY SEE THE RENDERED PAGE CONTENT. 
- Any italicized text rendered in the initial template is intended to be replaced IMMEDIATELY upon repository creation.

- This template is default but not mandatory. It was designed to compensate for typical gaps in Microsoft READMEs 
  that slow the pace of work. You may delete it if you have a fully populated README to replace it with.

- Most README sections below are commented out as they are not known early in a repository's life. Others are commented 
  out as they do not apply to every repository. If a section will be appropriate later but not known now, consider 
  leaving it in commented out and adding an issue as a reminder.
- There are additional optional README sections in the external instruction link below. These include; "citation",  
  "built with", "acknowledgments", "folder structure", etc.
- You can easily find the places to add content that will be rendered to the end user by searching 
within the file for "TODO".



- ADDITIONAL EXTERNAL TEMPLATE INSTRUCTIONS:
  -  https://aka.ms/StartRight/README-Template/Instructions

======================================================================================
====================================================================================-->


<!---------------------[  Description  ]------------------<recommended> section below------------------>

# Grafana Azure Cloud Native Monitoring

<!-- 
INSTRUCTIONS:
- Write description paragraph(s) that can stand alone. Remember 1st paragraph may be consumed by aggregators to improve 
  search experience.
- You description should allow any reader to figure out:
    1. What it does?
    2. Why was it was created?
    3. Who created?
    4. What is it's maturity?
    5. What is the larger context?
- Write for a reasonable person with zero context regarding your product, org, and team. The person may be evaluating if 
this is something they can use.

How to Evaluate & Examples: 
  - https://aka.ms/StartRight/README-Template/Instructions#description
-->

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
1. Clone this repository
    ```
    git clone https://github.com/aep-edge-microsoft/AzureMonitor-Grafana.git
    ```
1. Open in Visual Studio Code and click `Ctrl` + `Shift` + `P`
1. Search for and click on `Rebuild and Reopen in Container`
1. Click `Ctrl` + `Shift` + `B`, this will start running the necessary `frontend` and `backend` tasks
1. Navigate to `localhost:3000`

<!-----------------------[  Deployment (CI/CD)  ]-----------<optional> section below--------------------->
### Deployment (CI/CD)

This Repo will be leveraing Azure Devops Pipelines for deployment

-----------------------------------------------


<!-----------------------[  Contributing  ]-----------------<recommended> section below------------------>
## Contributing

<!--
INSTRUCTIONS: 
- Establish expectations and processes for existing & new developers to contribute to the repository.
  - Describe whether first step should be email, teams message, issue, or direct to pull request.
  - Express whether fork or branch preferred.
- CONTRIBUTING content Location:
  - You can tell users how to contribute in the README directly or link to a separate CONTRIBUTING.md file.
  - The README sections "Contacts" and "Reuse Expectations" can be seen as subsections to CONTRIBUTING.
  
How to Evaluate & Examples:
  - https://aka.ms/StartRight/README-Template/Instructions#contributing
-->

<!---- [TODO]  CONTENT GOES BELOW ------->
_This repository prefers outside contributors start forks rather than branches. Pull requests that do not come from a forked repo, will not be reviewed_

Before creating a Pull Request, please make sure you have opened a github issue that goes over what you are trying to do and whether it is a bug fix or a new feature. The github issue should be linked on the PR

If you are a new potential collaborator who finds reaching out or contributing to another project awkward, you may find 
it useful to read these [tips & tricks](https://aka.ms/StartRight/README-Template/innerSource/2021_02_TipsAndTricksForCollaboration) 
on InnerSource Communication.
 
### Support & Reuse Expectations

_The creators of this repository **DO NOT EXPECT REUSE**._

If you do use it, please leave a note in an issue, so we can best understand the value of this repository.

--------------------------------------------

## How to Accomplish Common User Actions
<!-- 
INSTRUCTIONS: 
- This section links to information useful to any user of this repository new to internal GitHub policies & workflows.
-->

 If you have trouble doing something related to this repository, please keep in mind that the following actions require 
 using [GitHub inside Microsoft (GiM) tooling](https://aka.ms/gim/docs) and not the normal GitHub visible user interface!
- [Switching between EMU GitHub and normal GitHub without logging out and back in constantly](https://aka.ms/StartRight/README-Template/maintainingMultipleAccount)
- [Creating a repository](https://aka.ms/StartRight)
- [Changing repository visibility](https://aka.ms/StartRight/README-Template/policies/jit) 
- [Gaining repository permissions, access, and roles](https://aka.ms/StartRight/README-TEmplates/gim/policies/access)
- [Enabling easy access to your low sensitivity and widely applicable repository by setting it to Internal Visibility and having any FTE who wants to see it join the 1ES Enterprise Visibility MyAccess Group](https://aka.ms/StartRight/README-Template/gim/innersource-access)
- [Migrating repositories](https://aka.ms/StartRight/README-Template/troubleshoot/migration)
- [Setting branch protection](https://aka.ms/StartRight/README-Template/gim/policies/branch-protection)
- [Setting up GitHubActions](https://aka.ms/StartRight/README-Template/policies/actions)
- [and other actions](https://aka.ms/StartRight/README-Template/gim/policies)

This README started as a template provided as part of the 
[StartRight](https://aka.ms/gim/docs/startright) tool that is used to create new repositories safely. Feedback on the
[README template](https://aka.ms/StartRight/README-Template) used in this repository is requested as an issue. 

**Trademarks** This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft’s Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.

