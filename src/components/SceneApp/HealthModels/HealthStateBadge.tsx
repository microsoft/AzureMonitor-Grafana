import { Badge } from '@grafana/ui';
import React from 'react';

export function HealthStateBadge({ healthState }: { healthState?: string }) {
  switch (healthState?.toLowerCase()) {
    case 'healthy':
      return <Badge text="Healthy" color="green" />;
    case 'degraded':
      return <Badge text="Degraded" color="orange" />;
    case 'unhealthy':
      return <Badge text="Unhealthy" color="red" />;
    default:
      return <Badge text={healthState ?? 'Unknown'} color="darkgrey" />;
  }
}
