import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import {
  DataSourceVariable,
  QueryVariable,
  SceneComponentProps,
  SceneObjectBase,
  SceneObjectState,
  sceneGraph,
  VariableValue,
} from '@grafana/scenes';
import { Alert, Badge, Button, Icon, Select, Spinner, useStyles2 } from '@grafana/ui';
import React from 'react';
import { AZMON_DS_VARIABLE, SUBSCRIPTION_VARIABLE } from '../../../constants';
import {
  createHealthModelsApi,
  getHealthModelsErrorMessage,
  HealthModelsClient,
  HealthModelsClientFactory,
  parseHealthModelResourceId,
} from './HealthModelsApi';
import { HealthStateBadge } from './HealthStateBadge';
import { formatHealthTimestamp, HealthTimelineBar } from './HealthTimelineBar';
import { HealthGraph } from './HealthGraph';
import { describeSignals, getEntityHealthMetrics } from './entityHealthMetrics';
import { summarizeHealthStates } from './healthModelUtils';
import {
  EntityHistoryResult,
  HealthModel,
  HealthModelEntity,
  HealthModelRelationship,
  HealthModelResourceId,
  PagedResult,
} from './types';

const MAX_VISIBLE_ENTITIES = 200;
const ENTITY_HISTORY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const ENTITY_HISTORY_PAGE_SIZE = 1000;

interface EntityHistoryViewState {
  loading: boolean;
  startAt: string;
  endAt: string;
  result?: EntityHistoryResult;
  error?: string;
}

interface HealthModelOverviewState extends SceneObjectState {
  loading: boolean;
  selectionMessage?: string;
  models: PagedResult<HealthModel>;
  selectedModelId?: string;
  resourceId?: HealthModelResourceId;
  model?: HealthModel;
  entities: PagedResult<HealthModelEntity>;
  relationships: PagedResult<HealthModelRelationship>;
  modelsError?: string;
  entitiesError?: string;
  relationshipsError?: string;
  expandedEntityId?: string;
  entityHistoryById: Record<string, EntityHistoryViewState>;
  lastUpdated?: number;
}

interface SettledResult<T> {
  value?: T;
  error?: string;
}

export interface HealthModelOverviewOptions {
  apiFactory?: HealthModelsClientFactory;
  fixedContext?: {
    datasourceUid: string;
    subscriptionId: string;
  };
}

export class HealthModelOverview extends SceneObjectBase<HealthModelOverviewState> {
  public static Component = HealthModelOverviewRenderer;

  private datasourceVariable?: DataSourceVariable;
  private subscriptionVariable?: QueryVariable;
  private requestGeneration = 0;
  private currentContextKey?: string;
  private activeDatasourceUid?: string;
  private nextHistoryRequestId = 0;
  private readonly historyRequestIds = new Map<string, number>();
  private readonly apiFactory: HealthModelsClientFactory;
  private readonly fixedContext?: HealthModelOverviewOptions['fixedContext'];

  public constructor(options: HealthModelOverviewOptions = {}) {
    super({
      loading: false,
      selectionMessage: 'Select a subscription to load its health models.',
      models: emptyPagedResult(),
      entities: emptyPagedResult(),
      relationships: emptyPagedResult(),
      entityHistoryById: {},
    });
    this.apiFactory = options.apiFactory ?? createHealthModelsApi;
    this.fixedContext = options.fixedContext;

    this.addActivationHandler(() => {
      if (this.fixedContext) {
        this.activeDatasourceUid = this.fixedContext.datasourceUid;
        void this.loadFromVariables();
        return () => {
          this.requestGeneration++;
          this.historyRequestIds.clear();
          this.currentContextKey = undefined;
          this.activeDatasourceUid = undefined;
        };
      }

      this.datasourceVariable = sceneGraph.lookupVariable(AZMON_DS_VARIABLE, this) as DataSourceVariable;
      this.subscriptionVariable = sceneGraph.lookupVariable(SUBSCRIPTION_VARIABLE, this) as QueryVariable;

      if (!this.datasourceVariable || !this.subscriptionVariable) {
        this.setState({
          selectionMessage: undefined,
          modelsError: 'The Health Models page variables could not be initialized.',
        });
        return;
      }

      const datasourceSubscription = this.datasourceVariable.subscribeToState(() => {
        void this.loadFromVariables();
      });
      const subscriptionSubscription = this.subscriptionVariable.subscribeToState(() => {
        void this.loadFromVariables();
      });

      void this.loadFromVariables();

      return () => {
        this.requestGeneration++;
        this.historyRequestIds.clear();
        this.currentContextKey = undefined;
        this.activeDatasourceUid = undefined;
        this.datasourceVariable = undefined;
        this.subscriptionVariable = undefined;
        datasourceSubscription.unsubscribe();
        subscriptionSubscription.unsubscribe();
      };
    });
  }

  public refresh = () => {
    void this.loadFromVariables(true);
  };

  public selectModel = (modelId?: string) => {
    if (!modelId || !this.activeDatasourceUid) {
      return;
    }

    const selectedModel = this.state.models.items.find((healthModel) => healthModel.id === modelId);
    if (!selectedModel || selectedModel.id === this.state.selectedModelId) {
      return;
    }

    const requestGeneration = ++this.requestGeneration;
    this.historyRequestIds.clear();
    this.setState({
      loading: true,
      selectionMessage: undefined,
      selectedModelId: selectedModel.id,
      resourceId: parseHealthModelResourceId(selectedModel.id),
      model: selectedModel,
      entities: emptyPagedResult(),
      relationships: emptyPagedResult(),
      entitiesError: undefined,
      relationshipsError: undefined,
      expandedEntityId: undefined,
      entityHistoryById: {},
      lastUpdated: undefined,
    });

    void this.loadSelectedModel(this.activeDatasourceUid, selectedModel, requestGeneration);
  };

  public toggleEntityHistory = (entity: HealthModelEntity) => {
    if (this.state.expandedEntityId === entity.id) {
      this.setState({
        expandedEntityId: undefined,
      });
      return;
    }

    this.setState({
      expandedEntityId: entity.id,
    });
    void this.loadEntityHistory(entity);
  };

  public reloadEntityHistory = (entity: HealthModelEntity) => {
    void this.loadEntityHistory(entity, true);
  };

  private async loadFromVariables(force = false) {
    if (this.fixedContext) {
      await this.loadContext(this.fixedContext.datasourceUid, this.fixedContext.subscriptionId, force);
      return;
    }

    const datasourceVariable = this.datasourceVariable;
    const subscriptionVariable = this.subscriptionVariable;

    if (!datasourceVariable || !subscriptionVariable) {
      return;
    }

    if (subscriptionVariable.state.loading) {
      this.invalidateContext('Loading subscriptions for the selected datasource.');
      return;
    }

    if (subscriptionVariable.state.error) {
      this.invalidateContext('Unable to load subscriptions for the selected datasource.');
      this.setState({
        modelsError: getHealthModelsErrorMessage(subscriptionVariable.state.error),
      });
      return;
    }

    const datasourceUid = singleVariableValue(datasourceVariable.state.value);
    const subscriptionId = singleVariableValue(subscriptionVariable.state.value);
    if (!datasourceUid) {
      this.invalidateContext('Select an Azure Monitor datasource.');
      return;
    }
    if (!subscriptionId) {
      this.invalidateContext('Select a subscription to load its health models.');
      return;
    }

    await this.loadContext(datasourceUid, subscriptionId, force);
  }

  private async loadContext(datasourceUid: string, subscriptionId: string, force: boolean) {
    const contextKey = `${datasourceUid}|${subscriptionId}`;
    if (!force && this.currentContextKey === contextKey) {
      return;
    }

    const contextChanged = this.currentContextKey !== contextKey;
    const requestGeneration = ++this.requestGeneration;
    this.historyRequestIds.clear();
    this.currentContextKey = contextKey;
    this.activeDatasourceUid = datasourceUid;
    this.setState({
      loading: true,
      selectionMessage: undefined,
      models: contextChanged ? emptyPagedResult() : this.state.models,
      selectedModelId: contextChanged ? undefined : this.state.selectedModelId,
      resourceId: contextChanged ? undefined : this.state.resourceId,
      model: contextChanged ? undefined : this.state.model,
      entities: contextChanged ? emptyPagedResult() : this.state.entities,
      relationships: contextChanged ? emptyPagedResult() : this.state.relationships,
      modelsError: undefined,
      entitiesError: undefined,
      relationshipsError: undefined,
      expandedEntityId: undefined,
      entityHistoryById: {},
      lastUpdated: contextChanged ? undefined : this.state.lastUpdated,
    });

    try {
      const api = await this.apiFactory(datasourceUid);
      const models = await api.listHealthModels(subscriptionId);
      if (requestGeneration !== this.requestGeneration || !this.isActive) {
        return;
      }

      if (models.items.length === 0) {
        this.setState({
          loading: false,
          selectionMessage: 'No health models were found in the selected subscription.',
          models,
          selectedModelId: undefined,
          resourceId: undefined,
          model: undefined,
          entities: emptyPagedResult(),
          relationships: emptyPagedResult(),
          lastUpdated: Date.now(),
        });
        return;
      }

      const selectedModel =
        models.items.find((healthModel) => healthModel.id === this.state.selectedModelId) ?? models.items[0];
      this.setState({
        models,
        selectedModelId: selectedModel.id,
        resourceId: parseHealthModelResourceId(selectedModel.id),
        model: selectedModel,
        entities: selectedModel.id === this.state.selectedModelId ? this.state.entities : emptyPagedResult(),
        relationships: selectedModel.id === this.state.selectedModelId ? this.state.relationships : emptyPagedResult(),
      });
      await this.loadSelectedModel(datasourceUid, selectedModel, requestGeneration, api);
    } catch (error) {
      if (requestGeneration !== this.requestGeneration || !this.isActive) {
        return;
      }

      this.setState({
        loading: false,
        modelsError: getHealthModelsErrorMessage(error),
      });
    }
  }

  private async loadSelectedModel(
    datasourceUid: string,
    selectedModel: HealthModel,
    requestGeneration: number,
    existingApi?: HealthModelsClient
  ) {
    try {
      const api = existingApi ?? (await this.apiFactory(datasourceUid));
      const [entitiesResult, relationshipsResult] = await Promise.all([
        settle(api.listEntities(selectedModel.id)),
        settle(api.listRelationships(selectedModel.id)),
      ]);

      if (requestGeneration !== this.requestGeneration || !this.isActive) {
        return;
      }

      this.setState({
        loading: false,
        entities: entitiesResult.value ?? this.state.entities,
        relationships: relationshipsResult.value ?? this.state.relationships,
        entitiesError: entitiesResult.error,
        relationshipsError: relationshipsResult.error,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      if (requestGeneration !== this.requestGeneration || !this.isActive) {
        return;
      }

      this.setState({
        loading: false,
        entitiesError: getHealthModelsErrorMessage(error),
        relationshipsError: getHealthModelsErrorMessage(error),
      });
    }
  }

  private async loadEntityHistory(entity: HealthModelEntity, force = false) {
    const datasourceUid = this.activeDatasourceUid;
    const modelId = this.state.selectedModelId;
    const existingHistory = this.state.entityHistoryById[entity.id];
    if (!datasourceUid || !modelId || (!force && (existingHistory?.loading || existingHistory?.result))) {
      return;
    }

    const endAt = new Date();
    const startAt = new Date(endAt.getTime() - ENTITY_HISTORY_LOOKBACK_MS);
    const requestId = ++this.nextHistoryRequestId;
    this.historyRequestIds.set(entity.id, requestId);
    this.setEntityHistoryState(entity.id, {
      loading: true,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });

    try {
      const api = await this.apiFactory(datasourceUid);
      const result = await api.getEntityHistory(modelId, entity.name, {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        top: ENTITY_HISTORY_PAGE_SIZE,
      });
      if (!this.isCurrentHistoryRequest(entity.id, requestId, datasourceUid, modelId)) {
        return;
      }

      this.setEntityHistoryState(entity.id, {
        loading: false,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        result,
      });
    } catch (error) {
      if (!this.isCurrentHistoryRequest(entity.id, requestId, datasourceUid, modelId)) {
        return;
      }

      this.setEntityHistoryState(entity.id, {
        loading: false,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        error: getHealthModelsErrorMessage(error),
      });
    }
  }

  private isCurrentHistoryRequest(
    entityId: string,
    requestId: number,
    datasourceUid: string,
    modelId: string
  ): boolean {
    return (
      this.isActive &&
      this.historyRequestIds.get(entityId) === requestId &&
      this.activeDatasourceUid === datasourceUid &&
      this.state.selectedModelId === modelId
    );
  }

  private setEntityHistoryState(entityId: string, historyState: EntityHistoryViewState) {
    this.setState({
      entityHistoryById: {
        ...this.state.entityHistoryById,
        [entityId]: historyState,
      },
    });
  }

  private invalidateContext(message: string) {
    this.requestGeneration++;
    this.historyRequestIds.clear();
    this.currentContextKey = undefined;
    this.activeDatasourceUid = undefined;
    this.setState({
      loading: false,
      selectionMessage: message,
      models: emptyPagedResult(),
      selectedModelId: undefined,
      resourceId: undefined,
      model: undefined,
      entities: emptyPagedResult(),
      relationships: emptyPagedResult(),
      modelsError: undefined,
      entitiesError: undefined,
      relationshipsError: undefined,
      expandedEntityId: undefined,
      entityHistoryById: {},
      lastUpdated: undefined,
    });
  }
}

async function settle<T>(request: Promise<T>): Promise<SettledResult<T>> {
  try {
    return {
      value: await request,
    };
  } catch (error) {
    return {
      error: getHealthModelsErrorMessage(error),
    };
  }
}

function emptyPagedResult<T>(): PagedResult<T> {
  return {
    items: [],
    pagesLoaded: 0,
    truncated: false,
  };
}

function singleVariableValue(value: VariableValue): string | undefined {
  if (Array.isArray(value)) {
    return value.length === 1 ? String(value[0]) : undefined;
  }

  const stringValue = value === null || value === undefined ? '' : String(value).trim();
  return stringValue || undefined;
}

function HealthModelOverviewRenderer({ model }: SceneComponentProps<HealthModelOverview>) {
  const state = model.useState();
  const styles = useStyles2(getStyles);
  const healthStateCounts = summarizeHealthStates(state.entities.items);
  const displayedEntities = [...state.entities.items]
    .sort((left, right) =>
      (left.properties?.displayName ?? left.name).localeCompare(right.properties?.displayName ?? right.name)
    )
    .slice(0, MAX_VISIBLE_ENTITIES);
  const modelOptions: Array<SelectableValue<string>> = state.models.items.map((healthModel) => {
    const resourceId = parseHealthModelResourceId(healthModel.id);
    return {
      label: `${healthModel.name} / ${resourceId.resourceGroupName}`,
      value: healthModel.id,
    };
  });
  const hasLoadedData =
    state.models.pagesLoaded > 0 || state.entities.pagesLoaded > 0 || state.relationships.pagesLoaded > 0;

  if (state.selectionMessage && state.models.items.length === 0) {
    return (
      <div className={styles.container}>
        <Alert title="Health Models" severity="info">
          {state.selectionMessage}
        </Alert>
        {state.modelsError && (
          <Alert title="Health Models API request failed" severity="error">
            {state.modelsError}
          </Alert>
        )}
      </div>
    );
  }

  if (state.loading && !hasLoadedData) {
    return (
      <div className={styles.loading}>
        <Spinner />
        <span>Loading health models from Microsoft.CloudHealth...</span>
      </div>
    );
  }

  const modelName = state.model?.name ?? state.resourceId?.healthModelName ?? 'Health Model';

  return (
    <div className={styles.container}>
      <div className={styles.modelSelector}>
        <label htmlFor="health-model-select">Health Model</label>
        <Select<string>
          inputId="health-model-select"
          aria-label="Health Model"
          options={modelOptions}
          value={state.selectedModelId}
          onChange={(option) => model.selectModel(option.value)}
          noOptionsMessage="No health models found"
          isSearchable
        />
      </div>

      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{modelName}</h2>
            <Badge text="Preview" color="blue" />
          </div>
          {state.resourceId && (
            <div className={styles.metadata}>
              Subscription: {state.resourceId.subscriptionId} &middot; Resource group:{' '}
              {state.resourceId.resourceGroupName}
              {state.model?.location && <> &middot; Location: {state.model.location}</>}
              {state.model?.properties?.provisioningState && (
                <> &middot; Provisioning: {state.model.properties.provisioningState}</>
              )}
            </div>
          )}
          {state.lastUpdated && (
            <div className={styles.metadata}>Last refreshed: {new Date(state.lastUpdated).toLocaleString()}</div>
          )}
        </div>
        <Button icon="sync" variant="secondary" onClick={model.refresh} disabled={state.loading}>
          Refresh
        </Button>
      </div>

      {state.loading && (
        <div className={styles.refreshing}>
          <Spinner />
          <span>Refreshing...</span>
        </div>
      )}

      {state.modelsError && (
        <Alert title="Health models could not be loaded" severity="warning">
          {state.modelsError}
        </Alert>
      )}
      {state.entitiesError && (
        <Alert title="Entities could not be loaded" severity="warning">
          {state.entitiesError}
        </Alert>
      )}
      {state.relationshipsError && (
        <Alert title="Relationships could not be loaded" severity="warning">
          {state.relationshipsError}
        </Alert>
      )}
      {(state.models.truncated || state.entities.truncated || state.relationships.truncated) && (
        <Alert title="Only part of the Health Models API result was loaded" severity="warning">
          Azure returned more than the configured pagination limit. Counts below describe only the loaded resources.
        </Alert>
      )}

      <div className={styles.summaryGrid}>
        <SummaryCard
          label={state.entities.truncated ? 'Loaded entities' : 'Entities'}
          value={state.entities.pagesLoaded > 0 ? state.entities.items.length : undefined}
        />
        <SummaryCard label="Healthy" value={state.entities.pagesLoaded > 0 ? healthStateCounts.healthy : undefined} />
        <SummaryCard label="Degraded" value={state.entities.pagesLoaded > 0 ? healthStateCounts.degraded : undefined} />
        <SummaryCard
          label="Unhealthy"
          value={state.entities.pagesLoaded > 0 ? healthStateCounts.unhealthy : undefined}
        />
        <SummaryCard label="Unknown" value={state.entities.pagesLoaded > 0 ? healthStateCounts.unknown : undefined} />
        <SummaryCard
          label={state.relationships.truncated ? 'Loaded relationships' : 'Relationships'}
          value={state.relationships.pagesLoaded > 0 ? state.relationships.items.length : undefined}
        />
      </div>

      {state.entities.items.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Health graph</h3>
          <HealthGraph entities={state.entities.items} relationships={state.relationships.items} />
        </>
      )}

      <h3 className={styles.sectionTitle}>Entities</h3>
      {state.entities.pagesLoaded > 0 && state.entities.items.length === 0 ? (
        <div className={styles.empty}>This health model does not contain any entities.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Health state</th>
                <th>Signals</th>
                <th>Alerts</th>
                <th>Impact</th>
                <th>Health objective</th>
                <th>Provisioning state</th>
              </tr>
            </thead>
            <tbody>
              {displayedEntities.map((entity) => {
                const isExpanded = state.expandedEntityId === entity.id;
                const entityDisplayName = entity.properties?.displayName ?? entity.name;
                const metrics = getEntityHealthMetrics(entity);
                return (
                  <React.Fragment key={entity.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className={styles.entityToggle}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} health history for ${entityDisplayName}`}
                          onClick={() => model.toggleEntityHistory(entity)}
                        >
                          <Icon name={isExpanded ? 'angle-down' : 'angle-right'} />
                          <span>{entityDisplayName}</span>
                        </button>
                      </td>
                      <td>
                        <HealthStateBadge healthState={entity.properties?.healthState} />
                      </td>
                      <td>{describeSignals(metrics)}</td>
                      <td>{metrics.alertSeverities.length > 0 ? metrics.alertSeverities.join(', ') : '--'}</td>
                      <td>{entity.properties?.impact ?? '--'}</td>
                      <td>
                        {entity.properties?.healthObjective == null ? '--' : `${entity.properties.healthObjective}%`}
                      </td>
                      <td>{entity.properties?.provisioningState ?? '--'}</td>
                    </tr>
                    {isExpanded && (
                      <tr className={styles.historyRow}>
                        <td colSpan={8}>
                          <EntityHistoryPanel
                            entity={entity}
                            historyState={state.entityHistoryById[entity.id]}
                            onRetry={() => model.reloadEntityHistory(entity)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {state.entities.items.length > MAX_VISIBLE_ENTITIES && (
        <div className={styles.metadata}>
          Showing the first {MAX_VISIBLE_ENTITIES} of {state.entities.items.length} loaded entities.
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value?: number }) {  const styles = useStyles2(getStyles);
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryValue}>{value ?? '--'}</div>
      <div className={styles.summaryLabel}>{label}</div>
    </div>
  );
}

function EntityHistoryPanel({
  entity,
  historyState,
  onRetry,
}: {
  entity: HealthModelEntity;
  historyState?: EntityHistoryViewState;
  onRetry: () => void;
}) {
  const styles = useStyles2(getStyles);

  if (!historyState || historyState.loading) {
    return (
      <div className={styles.historyLoading}>
        <Spinner />
        <span>Loading health history for the previous 24 hours...</span>
      </div>
    );
  }

  if (historyState.error) {
    return (
      <div className={styles.historyPanel}>
        <Alert title="Health history could not be loaded" severity="error">
          {historyState.error}
        </Alert>
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyHeader}>
        <div>
          <strong>Health history</strong>
          <div className={styles.metadata}>
            {formatHealthTimestamp(historyState.startAt)} to {formatHealthTimestamp(historyState.endAt)}
          </div>
        </div>
        <div className={styles.currentHealthState}>
          <span>Current state</span>
          <HealthStateBadge healthState={entity.properties?.healthState} />
        </div>
      </div>

      {historyState.result?.truncated && (
        <Alert title="Only part of this entity's history was loaded" severity="warning">
          Azure returned more history pages than the configured request limit.
        </Alert>
      )}

      <HealthTimelineBar
        transitions={historyState.result?.history ?? []}
        startAt={historyState.startAt}
        endAt={historyState.endAt}
        currentState={entity.properties?.healthState}
      />
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: theme.spacing(2),
    }),
    loading: css({
      minHeight: 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(1),
    }),
    modelSelector: css({
      maxWidth: 600,
      marginBottom: theme.spacing(2),
      '& label': {
        display: 'block',
        marginBottom: theme.spacing(0.5),
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.fontWeightMedium,
      },
    }),
    refreshing: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing(2),
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(2),
    }),
    titleRow: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    }),
    title: css({
      margin: 0,
    }),
    metadata: css({
      color: theme.colors.text.secondary,
      marginTop: theme.spacing(0.5),
      overflowWrap: 'anywhere',
    }),
    summaryGrid: css({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(3),
    }),
    summaryCard: css({
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(2),
    }),
    summaryValue: css({
      fontSize: theme.typography.h2.fontSize,
      lineHeight: theme.typography.h2.lineHeight,
      fontWeight: theme.typography.fontWeightMedium,
    }),
    summaryLabel: css({
      color: theme.colors.text.secondary,
      marginTop: theme.spacing(0.5),
    }),
    sectionTitle: css({
      margin: theme.spacing(0, 0, 1),
    }),
    tableWrapper: css({
      overflowX: 'auto',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),
    table: css({
      width: '100%',
      borderCollapse: 'collapse',
      '& > thead > tr > th, & > tbody > tr > td': {
        padding: theme.spacing(1),
        textAlign: 'left',
        borderBottom: `1px solid ${theme.colors.border.weak}`,
      },
      '& > thead > tr > th': {
        color: theme.colors.text.secondary,
        background: theme.colors.background.secondary,
        fontWeight: theme.typography.fontWeightMedium,
      },
      '& > tbody > tr:last-child > td': {
        borderBottom: 0,
      },
    }),
    entityToggle: css({
      appearance: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      padding: 0,
      border: 0,
      background: 'transparent',
      color: theme.colors.text.primary,
      cursor: 'pointer',
      font: 'inherit',
      textAlign: 'left',
      '&:hover span': {
        textDecoration: 'underline',
      },
      '&:focus-visible': {
        outline: '2px solid currentColor',
        outlineOffset: 2,
      },
    }),
    historyRow: css({
      '& > td': {
        padding: '0 !important',
        background: theme.colors.background.secondary,
      },
    }),
    historyPanel: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      padding: theme.spacing(2),
    }),
    historyLoading: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(2),
      color: theme.colors.text.secondary,
    }),
    historyHeader: css({
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing(2),
    }),
    currentHealthState: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      color: theme.colors.text.secondary,
    }),
    empty: css({
      padding: theme.spacing(3),
      textAlign: 'center',
      color: theme.colors.text.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),
  };
}
