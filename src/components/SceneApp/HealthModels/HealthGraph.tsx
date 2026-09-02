import { css } from '@emotion/css';
import { GrafanaTheme2, IconName } from '@grafana/data';
import { Alert, Icon, IconButton, useStyles2, useTheme2 } from '@grafana/ui';
import React from 'react';
import {
  canPan,
  clampTransform,
  fitTransform,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  Size,
  ViewportTransform,
  zoomAt,
  ZOOM_STEP,
} from './graphViewport';
import { getHealthStateColor } from './HealthTimelineBar';
import {
  buildHealthGraph,
  HealthGraphEdge,
  HealthGraphLayoutOptions,
  HealthGraphNode,
} from './healthGraphLayout';
import { HealthModelEntity, HealthModelRelationship } from './types';

const CANVAS_PADDING = 16;
const DEFAULT_VIEWPORT_HEIGHT = 620;
const KEYBOARD_PAN_STEP = 40;

interface HealthGraphProps {
  entities: HealthModelEntity[];
  relationships: HealthModelRelationship[];
  /** Viewport height in pixels. Panels pass their own height so the graph fills the panel. */
  height?: number;
}

/**
 * Draws Health Model entities as a top-down graph, with each entity coloured by its health state
 * and connected to its children through elbow connectors. The graph can be panned and zoomed so
 * large models stay readable.
 */
export function HealthGraph({ entities, relationships, height = DEFAULT_VIEWPORT_HEIGHT }: HealthGraphProps) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const layout = React.useMemo(() => buildHealthGraph(entities, relationships), [entities, relationships]);

  const canvas: Size = {
    width: layout.width + CANVAS_PADDING * 2,
    height: layout.height + CANVAS_PADDING * 2,
  };

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = React.useState<Size>({ width: 0, height: 0 });
  const [transform, setTransform] = React.useState<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = React.useState(false);

  // Latest values for the native wheel listener, which is registered once and must not close over
  // stale state.
  const latest = React.useRef({ canvas, viewport, transform });
  latest.current = { canvas, viewport, transform };

  React.useEffect(() => {
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) =>
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitToViewport = React.useCallback(() => {
    const { canvas: content, viewport: bounds } = latest.current;
    setTransform(fitTransform(content, bounds, CANVAS_PADDING));
  }, []);

  // Re-fit when the model or the available space changes, so switching health models never leaves
  // the graph scrolled off screen.
  React.useEffect(() => {
    fitToViewport();
  }, [fitToViewport, layout, viewport.width, viewport.height]);

  const applyZoom = React.useCallback((factor: number, pointerX?: number, pointerY?: number) => {
    const { canvas: content, viewport: bounds, transform: current } = latest.current;
    const originX = pointerX ?? bounds.width / 2;
    const originY = pointerY ?? bounds.height / 2;
    setTransform(clampTransform(zoomAt(current, factor, originX, originY), content, bounds));
  }, []);

  // Registered natively because React's onWheel is passive, and a passive listener cannot stop the
  // page from scrolling while the pointer is over the graph.
  React.useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      const { canvas: content, viewport: bounds, transform: current } = latest.current;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        setTransform(
          clampTransform(
            zoomAt(current, Math.pow(ZOOM_STEP, -event.deltaY / 100), event.clientX - rect.left, event.clientY - rect.top),
            content,
            bounds
          )
        );
        return;
      }

      // Only swallow the scroll while the graph itself still has room to move, so the page keeps
      // scrolling once the user reaches the edge of the graph.
      if (!canPan(current, content, bounds, event.deltaX, event.deltaY)) {
        return;
      }

      event.preventDefault();
      setTransform(clampTransform(panBy(current, -event.deltaX, -event.deltaY), content, bounds));
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }

    const { canvas: content, viewport: bounds, transform: current } = latest.current;
    setTransform(clampTransform(panBy(current, event.movementX, event.movementY), content, bounds));
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { canvas: content, viewport: bounds, transform: current } = latest.current;
    const pan = (deltaX: number, deltaY: number) => {
      event.preventDefault();
      setTransform(clampTransform(panBy(current, deltaX, deltaY), content, bounds));
    };

    switch (event.key) {
      case 'ArrowLeft':
        return pan(KEYBOARD_PAN_STEP, 0);
      case 'ArrowRight':
        return pan(-KEYBOARD_PAN_STEP, 0);
      case 'ArrowUp':
        return pan(0, KEYBOARD_PAN_STEP);
      case 'ArrowDown':
        return pan(0, -KEYBOARD_PAN_STEP);
      case '+':
      case '=':
        event.preventDefault();
        return applyZoom(ZOOM_STEP);
      case '-':
      case '_':
        event.preventDefault();
        return applyZoom(1 / ZOOM_STEP);
      case '0':
        event.preventDefault();
        return fitToViewport();
      default:
        return undefined;
    }
  };

  if (layout.nodes.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {layout.danglingRelationships > 0 && (
        <Alert title="Some relationships were skipped" severity="info">
          {layout.danglingRelationships} relationship(s) reference an entity that is not part of this Health Model.
        </Alert>
      )}
      <div className={styles.viewportWrapper} style={{ height }}>
        <div
          ref={viewportRef}
          className={isPanning ? styles.viewportPanning : styles.viewport}
          role="application"
          tabIndex={0}
          aria-label="Health model graph. Drag to pan, use Ctrl and scroll to zoom, or press plus, minus and zero."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onKeyDown={onKeyDown}
        >
          <div
            className={styles.canvas}
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            <svg className={styles.connectors} width={canvas.width} height={canvas.height} aria-hidden="true">
              {layout.edges.map((edge) => (
                <path
                  key={edge.id}
                  d={buildConnectorPath(edge)}
                  fill="none"
                  stroke={theme.colors.border.medium}
                  strokeWidth={1}
                />
              ))}
            </svg>

            {layout.edges
              .filter((edge) => edge.label)
              .map((edge) => (
                <div
                  key={`${edge.id}-label`}
                  className={styles.edgeLabel}
                  style={{
                    left: edge.labelX + CANVAS_PADDING,
                    top: edge.labelY + CANVAS_PADDING,
                  }}
                  title={edge.label}
                >
                  {edge.label}
                </div>
              ))}

            {layout.nodes.map((node) => (
              <EntityCard key={node.name} node={node} layoutOptions={layout.options} />
            ))}
          </div>
        </div>

        <div className={styles.controls}>
          <IconButton
            name="plus"
            tooltip="Zoom in"
            aria-label="Zoom in"
            disabled={transform.scale >= MAX_ZOOM}
            onClick={() => applyZoom(ZOOM_STEP)}
          />
          <IconButton
            name="minus"
            tooltip="Zoom out"
            aria-label="Zoom out"
            disabled={transform.scale <= MIN_ZOOM}
            onClick={() => applyZoom(1 / ZOOM_STEP)}
          />
          <IconButton name="compress-arrows" tooltip="Fit to view" aria-label="Fit to view" onClick={fitToViewport} />
        </div>
      </div>
    </div>
  );
}

function EntityCard({ node, layoutOptions }: { node: HealthGraphNode; layoutOptions: HealthGraphLayoutOptions }) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const healthState = node.healthState ?? 'Unknown';
  const healthColor = getHealthStateColor(theme, healthState);

  return (
    <div
      className={styles.node}
      style={{
        left: node.x + CANVAS_PADDING,
        top: node.y + CANVAS_PADDING,
        width: layoutOptions.nodeWidth,
        height: layoutOptions.nodeHeight,
        borderColor: healthColor,
      }}
      aria-label={`${node.displayName}, health state ${healthState}`}
      title={`${node.displayName} — ${healthState}`}
    >
      <div className={styles.nodeHeader}>
        <Icon name={getEntityIcon(node.iconName)} size="lg" className={styles.nodeIcon} />
        <span className={styles.nodeTitle}>{node.displayName}</span>
      </div>
      <div className={styles.nodeFooter}>
        <Icon name={getHealthIcon(healthState)} style={{ color: healthColor }} />
        <span className={styles.nodeHealthText}>{healthState}</span>
      </div>
    </div>
  );
}

// Draws the parent-to-child connector as a vertical drop, a horizontal run, and a second drop so
// that sibling edges do not cross one another.
export function buildConnectorPath(edge: HealthGraphEdge): string {
  const parentX = edge.parentX + CANVAS_PADDING;
  const parentY = edge.parentY + CANVAS_PADDING;
  const childX = edge.childX + CANVAS_PADDING;
  const childY = edge.childY + CANVAS_PADDING;
  const elbowY = edge.elbowY + CANVAS_PADDING;

  if (Math.abs(parentX - childX) < 0.5) {
    return `M ${parentX} ${parentY} L ${parentX} ${childY}`;
  }

  return `M ${parentX} ${parentY} L ${parentX} ${elbowY} L ${childX} ${elbowY} L ${childX} ${childY}`;
}

export function getEntityIcon(iconName?: string): IconName {
  switch (iconName?.toLowerCase()) {
    case 'appservice':
      return 'cloud';
    case 'systemcomponent':
      return 'sitemap';
    case 'database':
      return 'database';
    default:
      return 'cube';
  }
}

export function getHealthIcon(healthState: string): IconName {
  switch (healthState.toLowerCase()) {
    case 'healthy':
      return 'check-circle';
    case 'degraded':
      return 'exclamation-triangle';
    case 'unhealthy':
      return 'times-circle';
    default:
      return 'question-circle';
  }
}

function getStyles(theme: GrafanaTheme2) {
  const viewport = css({
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    touchAction: 'none',
    cursor: 'grab',
    '&:focus-visible': {
      outline: `2px solid ${theme.colors.primary.border}`,
      outlineOffset: -2,
    },
  });

  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    viewportWrapper: css({
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.canvas,
    }),
    viewport,
    viewportPanning: css(viewport, { cursor: 'grabbing' }),
    controls: css({
      position: 'absolute',
      top: theme.spacing(1),
      right: theme.spacing(1),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      padding: theme.spacing(0.5),
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
    }),
    canvas: css({
      position: 'relative',
      transformOrigin: 'top left',
      userSelect: 'none',
    }),
    connectors: css({
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
    }),
    node: css({
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      overflow: 'hidden',
    }),
    nodeHeader: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1, 1.5),
      minHeight: 0,
      flex: 1,
    }),
    nodeIcon: css({
      flex: '0 0 auto',
      color: theme.colors.text.secondary,
    }),
    nodeTitle: css({
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      color: theme.colors.text.primary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.typography.bodySmall.lineHeight,
      wordBreak: 'break-word',
    }),
    nodeFooter: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      padding: theme.spacing(0.5, 1.5),
      borderTop: `1px solid ${theme.colors.border.weak}`,
    }),
    nodeHealthText: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    edgeLabel: css({
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      maxWidth: 190,
      padding: theme.spacing(0.25, 0.75),
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.3,
      textAlign: 'center',
      pointerEvents: 'none',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
    }),
  };
}
