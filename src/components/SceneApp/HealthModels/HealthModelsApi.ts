import { DataSourceApi } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import {
  ArmListResponse,
  EntityHealthTransition,
  EntityHistoryRequest,
  EntityHistoryResponse,
  EntityHistoryResult,
  HEALTH_MODELS_API_VERSION,
  HealthModel,
  HealthModelEntity,
  HealthModelRelationship,
  HealthModelResourceId,
  PagedResult,
} from './types';

export const AZURE_MONITOR_DATASOURCE_TYPE = 'grafana-azure-monitor-datasource';
export const DEFAULT_MAX_ARM_PAGES = 50;

export interface AzureMonitorArmDataSource {
  type: string;
  getResource<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T>;
  postResource<T = unknown>(
    path: string,
    data?: unknown,
    options?: {
      params?: Record<string, unknown>;
    }
  ): Promise<T>;
}

export interface HealthModelsClient {
  listHealthModels(subscriptionId: string): Promise<PagedResult<HealthModel>>;
  listEntities(modelId: string): Promise<PagedResult<HealthModelEntity>>;
  listRelationships(modelId: string): Promise<PagedResult<HealthModelRelationship>>;
  getEntityHistory(modelId: string, entityName: string, request?: EntityHistoryRequest): Promise<EntityHistoryResult>;
}

export type HealthModelsClientFactory = (datasourceUid: string) => Promise<HealthModelsClient>;

export function isAzureMonitorArmDataSource(
  datasource: DataSourceApi
): datasource is DataSourceApi & AzureMonitorArmDataSource {
  const resourceDatasource = datasource as Partial<AzureMonitorArmDataSource>;
  return (
    datasource.type === AZURE_MONITOR_DATASOURCE_TYPE &&
    typeof resourceDatasource.getResource === 'function' &&
    typeof resourceDatasource.postResource === 'function'
  );
}

export async function createHealthModelsApi(datasourceUid: string): Promise<HealthModelsApi> {
  const datasource = await getDataSourceSrv().get({
    type: AZURE_MONITOR_DATASOURCE_TYPE,
    uid: datasourceUid,
  });

  if (!isAzureMonitorArmDataSource(datasource)) {
    throw new Error('The selected Azure Monitor datasource does not support authenticated resource requests.');
  }

  return new HealthModelsApi(datasource);
}

export class HealthModelsApi implements HealthModelsClient {
  public constructor(
    private readonly datasource: AzureMonitorArmDataSource,
    private readonly maxPages = DEFAULT_MAX_ARM_PAGES
  ) {
    if (maxPages < 1) {
      throw new Error('maxPages must be at least 1.');
    }
  }

  public async listHealthModels(subscriptionId: string): Promise<PagedResult<HealthModel>> {
    validateSubscriptionId(subscriptionId);
    const collectionPath = `/subscriptions/${subscriptionId}/providers/Microsoft.CloudHealth/healthmodels`;
    const result = await this.listCollection<HealthModel>(collectionPath, 'health models');

    for (const healthModel of result.items) {
      const resourceId = parseHealthModelResourceId(healthModel.id);
      if (resourceId.subscriptionId.toLowerCase() !== subscriptionId.toLowerCase()) {
        throw new Error('Azure returned a health model from a different subscription.');
      }
    }

    return result;
  }

  public listEntities(modelId: string): Promise<PagedResult<HealthModelEntity>> {
    parseHealthModelResourceId(modelId);
    return this.listCollection<HealthModelEntity>(`${modelId}/entities`, 'entities');
  }

  public listRelationships(modelId: string): Promise<PagedResult<HealthModelRelationship>> {
    parseHealthModelResourceId(modelId);
    return this.listCollection<HealthModelRelationship>(`${modelId}/relationships`, 'relationships');
  }

  public async getEntityHistory(
    modelId: string,
    entityName: string,
    request: EntityHistoryRequest = {}
  ): Promise<EntityHistoryResult> {
    parseHealthModelResourceId(modelId);
    const normalizedEntityName = entityName.trim();
    if (!normalizedEntityName) {
      throw new Error('An entity name is required to load health history.');
    }

    const requestPath = `azuremonitor${modelId}/entities/${encodeURIComponent(normalizedEntityName)}/getHistory`;
    const history: EntityHealthTransition[] = [];
    let requestBody = request;
    let nextMarker: string | undefined;
    let pagesLoaded = 0;

    do {
      const page = await this.datasource.postResource<EntityHistoryResponse>(requestPath, requestBody, {
        params: {
          'api-version': HEALTH_MODELS_API_VERSION,
        },
      });
      if (!page || typeof page.entityName !== 'string' || !Array.isArray(page.history)) {
        throw new Error('Azure returned an invalid entity history response.');
      }
      if (page.entityName.toLowerCase() !== normalizedEntityName.toLowerCase()) {
        throw new Error('Azure returned history for a different entity.');
      }

      history.push(...page.history);
      pagesLoaded++;
      nextMarker = typeof page.nextMarker === 'string' && page.nextMarker.trim() ? page.nextMarker : undefined;

      if (nextMarker && pagesLoaded < this.maxPages) {
        requestBody = {
          ...(request.top === undefined ? {} : { top: request.top }),
          nextMarker,
        };
      }
    } while (nextMarker && pagesLoaded < this.maxPages);

    return {
      entityName: normalizedEntityName,
      history,
      pagesLoaded,
      truncated: Boolean(nextMarker),
    };
  }

  private async listCollection<T>(collectionPath: string, collectionName: string): Promise<PagedResult<T>> {
    // `azuremonitor` is Grafana's authenticated ARM proxy route. Every target path remains a Microsoft.CloudHealth API.
    let requestPath = `azuremonitor${collectionPath}`;
    let requestParams: Record<string, unknown> | undefined = {
      'api-version': HEALTH_MODELS_API_VERSION,
    };
    let nextLink: string | undefined;
    const items: T[] = [];
    let pagesLoaded = 0;

    do {
      const page = await this.datasource.getResource<ArmListResponse<T>>(requestPath, requestParams);
      if (!page || !Array.isArray(page.value)) {
        throw new Error(`Azure returned an invalid ${collectionName} response.`);
      }

      items.push(...page.value);
      pagesLoaded++;
      nextLink = page.nextLink;

      if (nextLink && pagesLoaded < this.maxPages) {
        requestPath = normalizeArmNextLink(nextLink, collectionPath);
        requestParams = undefined;
      }
    } while (nextLink && pagesLoaded < this.maxPages);

    return {
      items,
      pagesLoaded,
      truncated: Boolean(nextLink),
    };
  }
}

function validateSubscriptionId(subscriptionId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subscriptionId)) {
    throw new Error('The selected value is not a valid Azure subscription ID.');
  }
}

export function parseHealthModelResourceId(modelId: string): HealthModelResourceId {
  const match =
    /^\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.CloudHealth\/healthmodels\/([^/?#]+)$/i.exec(
      modelId
    );

  if (!match) {
    throw new Error('The selected value is not a valid Microsoft.CloudHealth health model resource ID.');
  }

  return {
    subscriptionId: match[1],
    resourceGroupName: match[2],
    healthModelName: match[3],
  };
}

export function normalizeArmNextLink(nextLink: string, expectedCollectionPath: string): string {
  const trimmedNextLink = nextLink.trim();
  if (!trimmedNextLink) {
    throw new Error('Azure returned an empty continuation link.');
  }

  const routePrefix = 'azuremonitor';
  const relativeOrAbsoluteLink = trimmedNextLink.toLowerCase().startsWith(`${routePrefix}/`)
    ? trimmedNextLink.slice(routePrefix.length)
    : trimmedNextLink;
  const parsedLink = new URL(relativeOrAbsoluteLink, 'https://management.azure.com');

  if (parsedLink.pathname.toLowerCase() !== expectedCollectionPath.toLowerCase()) {
    throw new Error('Azure returned a continuation link for a different resource collection.');
  }

  return `${routePrefix}${parsedLink.pathname}${parsedLink.search}`;
}

export function getHealthModelsErrorMessage(error: unknown): string {
  const responseError = error as {
    status?: number;
    statusText?: string;
    message?: string;
    data?: {
      message?: string;
      error?: {
        message?: string;
      };
    };
  };

  switch (responseError?.status) {
    case 403:
      return 'The selected Azure Monitor datasource identity is not authorized to read this health model.';
    case 404:
      return 'The health model was not found, or the preview API is unavailable in this Azure environment.';
    case 429:
      return 'Azure throttled the request. Wait briefly, then refresh the health model.';
  }

  return (
    responseError?.data?.error?.message ??
    responseError?.data?.message ??
    responseError?.message ??
    responseError?.statusText ??
    'The health model request failed.'
  );
}
