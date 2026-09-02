export const HEALTH_MODELS_API_VERSION = '2026-09-01-preview';

export interface HealthModelResourceId {
  subscriptionId: string;
  resourceGroupName: string;
  healthModelName: string;
}

export interface HealthModel {
  id: string;
  name: string;
  type: string;
  location?: string;
  tags?: Record<string, string>;
  properties?: {
    provisioningState?: string;
  };
}

export interface HealthModelEntity {
  id: string;
  name: string;
  type: string;
  properties?: {
    displayName?: string;
    healthState?: string;
    impact?: string;
    provisioningState?: string;
    healthObjective?: number | null;
    tags?: Record<string, string>;
    /**
     * Alert definitions keyed by the health state that triggers them, for example `unhealthy`.
     */
    alerts?: Record<string, { severity?: string; description?: string } | undefined>;
    /**
     * Signal configuration and last reported status, keyed by signal group (`azureResource`,
     * `azureLogAnalytics`, `dependencies`, ...). The shape varies per group and is still in
     * preview, so it is read defensively rather than modelled exactly.
     */
    signalGroups?: Record<string, unknown>;
  };
}

export interface HealthModelRelationship {
  id: string;
  name: string;
  type: string;
  properties?: {
    displayName?: string;
    parentEntityName: string;
    childEntityName: string;
    provisioningState?: string;
    tags?: Record<string, string>;
  };
}

export interface EntityHistoryRequest {
  startAt?: string;
  endAt?: string;
  top?: number;
  nextMarker?: string;
}

export interface EntityHealthTransition {
  previousState?: string;
  newState: string;
  occurredAt: string;
  reason?: string;
}

export interface EntityHistoryResponse {
  entityName: string;
  history: EntityHealthTransition[];
  nextMarker?: string | null;
}

export interface EntityHistoryResult {
  entityName: string;
  history: EntityHealthTransition[];
  pagesLoaded: number;
  truncated: boolean;
}

export interface ArmListResponse<T> {
  value: T[];
  nextLink?: string;
}

export interface PagedResult<T> {
  items: T[];
  pagesLoaded: number;
  truncated: boolean;
}
