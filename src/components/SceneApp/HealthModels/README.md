# Azure Health Models

This directory contains the read-only Azure Health Models preview experience for the Azure Cloud Native Monitoring app.

## What changed

The app now has a **Health Models** tab that:

- Uses the existing Azure Monitor datasource and subscription selectors.
- Lists Health Model resources in the selected subscription.
- Loads the selected model's current entities and relationships.
- Summarizes entity health states and displays basic entity details.
- Lazily loads the previous 24 hours of health transitions and renders them as a proportional horizontal state timeline when an entity row is expanded.
- Follows ARM continuation links with a bounded page limit and identifies partial results.
- Handles model, entity, and relationship failures independently so available data remains visible.

To place the same data on an ordinary dashboard, use the Azure Monitor datasource's built-in
**Azure Health Models** query type rather than this page.

The implementation is split across the following files:

| File                       | Responsibility                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `../Pages/HealthModels.ts` | Registers the Scene tab and its datasource and subscription variables.                                    |
| `HealthModelOverview.tsx`  | Owns the Scene lifecycle, selection state, asynchronous loading, stale-request protection, and rendering. |
| `HealthModelsApi.ts`       | Calls the Health Models ARM API, validates resource paths, and follows bounded continuation links.        |
| `types.ts`                 | Defines the subset of the Health Models contract used by this preview.                                    |
| `healthModelUtils.ts`      | Calculates the displayed health-state summary.                                                            |

## API boundary

All feature data comes from the `Microsoft.CloudHealth` Health Models API using `2026-09-01-preview`:

```text
GET /subscriptions/{subscriptionId}/providers/Microsoft.CloudHealth/healthmodels
GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CloudHealth/healthmodels/{healthModelName}/entities
GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CloudHealth/healthmodels/{healthModelName}/relationships
POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CloudHealth/healthmodels/{healthModelName}/entities/{entityName}/getHistory
```

The configured Azure Monitor datasource is used only as an authenticated ARM transport. Its `azuremonitor/` backend resource route attaches the datasource's Azure credentials and forwards the relative request to the configured Resource Manager endpoint. The feature does not obtain Health Models data from Azure Monitor metrics, logs, or Resource Graph.

Keeping that transport detail inside `HealthModelsApi.ts` prevents the rest of the feature from depending on the datasource's internal route shape.

## Why this design

### Reuse configured Azure authentication

The app already requires an Azure Monitor datasource. Reusing its authenticated ARM client avoids introducing a second Azure credential configuration in the app backend and preserves the datasource's configured Azure cloud and identity.

### Call the Health Models API directly

Health Model entities and relationships are proxy resources that are not discoverable through Resource Graph. Calling `Microsoft.CloudHealth` directly also gives the feature one consistent contract for model discovery and model data.

### Remain read-only

The first contribution is an operational monitoring experience, not a model designer. It issues GET requests and the read-only `getHistory` POST action, leaving creation, editing, and deletion in Azure. The selected datasource identity should have only the Azure permissions needed to read the target Health Models.

### Load only while the Scene is active

`HealthModelOverview` starts requests from a Scene activation handler. It invalidates requests when the datasource, subscription, model, or active Scene changes so an older response cannot replace newer state.

### Bound large model results

Model, entity, and relationship lists can be paged and large. The API adapter follows only a bounded number of same-collection continuation links. If Azure returns additional pages, the UI labels the result as partial rather than presenting loaded counts as complete totals. Entity rendering is also capped while summary calculations continue across all loaded entities.

## Current MVP limits

- One subscription is selected at a time.
- Entity history is loaded on demand for the previous 24 hours; the page does not yet expose a configurable history range.
- Signal history and data annotations are not displayed.
- Model configuration and write operations are intentionally excluded.
- The custom Health Models data-plane audience is not used; this experience calls the ARM control-plane API.
