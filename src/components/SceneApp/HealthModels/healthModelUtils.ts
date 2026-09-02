import { EntityHealthTransition, HealthModelEntity } from './types';

export interface HealthStateCounts {
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
}

export interface HealthTimelineSegment {
  state: string;
  startAt: number;
  endAt: number;
}

export function summarizeHealthStates(entities: HealthModelEntity[]): HealthStateCounts {
  return entities.reduce<HealthStateCounts>(
    (counts, entity) => {
      switch (entity.properties?.healthState?.toLowerCase()) {
        case 'healthy':
          counts.healthy++;
          break;
        case 'degraded':
          counts.degraded++;
          break;
        case 'unhealthy':
          counts.unhealthy++;
          break;
        default:
          counts.unknown++;
          break;
      }

      return counts;
    },
    {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    }
  );
}

export function buildHealthTimeline(
  transitions: EntityHealthTransition[],
  startAt: string,
  endAt: string,
  currentState?: string
): HealthTimelineSegment[] {
  const startTime = Date.parse(startAt);
  const endTime = Date.parse(endAt);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return [];
  }

  const orderedTransitions = transitions
    .map((transition, index) => ({
      index,
      time: Date.parse(transition.occurredAt),
      transition,
    }))
    .filter(({ time }) => Number.isFinite(time))
    .sort((left, right) => left.time - right.time || left.index - right.index);
  const transitionsAtOrBeforeStart = orderedTransitions.filter(({ time }) => time <= startTime);
  const latestTransitionAtOrBeforeStart = transitionsAtOrBeforeStart[transitionsAtOrBeforeStart.length - 1];
  const transitionsInRange = orderedTransitions.filter(({ time }) => time > startTime && time < endTime);

  let state = normalizeHealthState(currentState);
  if (latestTransitionAtOrBeforeStart) {
    state = normalizeHealthState(latestTransitionAtOrBeforeStart.transition.newState);
  } else if (transitionsInRange.length > 0) {
    state = normalizeHealthState(transitionsInRange[0].transition.previousState);
  }
  let cursor = startTime;
  const segments: HealthTimelineSegment[] = [];

  for (const { time, transition } of transitionsInRange) {
    appendTimelineSegment(segments, state, cursor, time);
    state = normalizeHealthState(transition.newState);
    cursor = time;
  }

  appendTimelineSegment(segments, state, cursor, endTime);
  return segments;
}

function appendTimelineSegment(segments: HealthTimelineSegment[], state: string, startAt: number, endAt: number) {
  if (endAt <= startAt) {
    return;
  }

  const previousSegment = segments[segments.length - 1];
  if (previousSegment?.state.toLowerCase() === state.toLowerCase() && previousSegment.endAt === startAt) {
    previousSegment.endAt = endAt;
    return;
  }

  segments.push({
    state,
    startAt,
    endAt,
  });
}

function normalizeHealthState(state?: string): string {
  switch (state?.trim().toLowerCase()) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'unhealthy':
      return 'Unhealthy';
    case 'unknown':
    case undefined:
    case '':
      return 'Unknown';
    default:
      return state?.trim() || 'Unknown';
  }
}
