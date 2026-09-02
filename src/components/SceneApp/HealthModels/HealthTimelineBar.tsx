import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, useTheme2 } from '@grafana/ui';
import React from 'react';
import { buildHealthTimeline } from './healthModelUtils';
import { EntityHealthTransition } from './types';

interface HealthTimelineBarProps {
  transitions: EntityHealthTransition[];
  startAt: string;
  endAt: string;
  currentState?: string;
}

const HEALTH_STATES = ['Healthy', 'Degraded', 'Unhealthy', 'Unknown'];

export function HealthTimelineBar({ transitions, startAt, endAt, currentState }: HealthTimelineBarProps) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const timeline = buildHealthTimeline(transitions, startAt, endAt, currentState);

  if (timeline.length === 0) {
    return <div className={styles.empty}>The health timeline could not be rendered for this period.</div>;
  }

  return (
    <>
      <div className={styles.timelineBar} role="list" aria-label="Entity health state timeline">
        {timeline.map((segment) => {
          const segmentLabel = `${segment.state}: ${formatHealthTimestamp(segment.startAt)} to ${formatHealthTimestamp(
            segment.endAt
          )}`;
          return (
            <div
              key={`${segment.startAt}-${segment.endAt}-${segment.state}`}
              className={styles.timelineSegment}
              role="listitem"
              aria-label={segmentLabel}
              title={segmentLabel}
              style={{
                backgroundColor: getHealthStateColor(theme, segment.state),
                flexGrow: segment.endAt - segment.startAt,
              }}
            />
          );
        })}
      </div>
      <div className={styles.timelineAxis}>
        <span>{formatHealthTimestamp(startAt)}</span>
        <span>{formatHealthTimestamp(endAt)}</span>
      </div>
      <div className={styles.timelineFooter}>
        <div className={styles.timelineLegend}>
          {HEALTH_STATES.map((healthState) => (
            <span className={styles.timelineLegendItem} key={healthState}>
              <span
                className={styles.timelineLegendSwatch}
                style={{ backgroundColor: getHealthStateColor(theme, healthState) }}
              />
              {healthState}
            </span>
          ))}
        </div>
        <span className={styles.transitionCount}>
          {transitions.length} {transitions.length === 1 ? 'transition' : 'transitions'}
        </span>
      </div>
    </>
  );
}

export function formatHealthTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? String(timestamp) : date.toLocaleString();
}

export function getHealthStateColor(theme: GrafanaTheme2, healthState: string): string {
  switch (healthState.toLowerCase()) {
    case 'healthy':
      return theme.visualization.getColorByName('green');
    case 'degraded':
      return theme.visualization.getColorByName('orange');
    case 'unhealthy':
      return theme.visualization.getColorByName('red');
    default:
      return theme.visualization.getColorByName('gray');
  }
}

function getStyles(theme: GrafanaTheme2) {
  return {
    timelineBar: css({
      display: 'flex',
      width: '100%',
      height: 36,
      overflow: 'hidden',
      background: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
    }),
    timelineSegment: css({
      flexBasis: 0,
      minWidth: 0,
      height: '100%',
      '&:hover': {
        filter: 'brightness(1.1)',
      },
    }),
    timelineAxis: css({
      display: 'flex',
      justifyContent: 'space-between',
      gap: theme.spacing(2),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    timelineFooter: css({
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    }),
    timelineLegend: css({
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing(1.5),
    }),
    timelineLegendItem: css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      color: theme.colors.text.secondary,
    }),
    timelineLegendSwatch: css({
      width: 12,
      height: 12,
      borderRadius: theme.shape.radius.default,
    }),
    transitionCount: css({
      color: theme.colors.text.secondary,
    }),
    empty: css({
      padding: theme.spacing(2),
      color: theme.colors.text.secondary,
      background: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),
  };
}
