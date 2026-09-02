import { HealthModelEntity, HealthModelRelationship } from './types';

export interface HealthGraphLayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  labelStagger: number;
}

export const DEFAULT_HEALTH_GRAPH_LAYOUT: HealthGraphLayoutOptions = {
  nodeWidth: 210,
  nodeHeight: 92,
  horizontalGap: 32,
  verticalGap: 108,
  labelStagger: 26,
};

export interface HealthGraphNode {
  name: string;
  displayName: string;
  healthState?: string;
  iconName?: string;
  entity: HealthModelEntity;
  depth: number;
  x: number;
  y: number;
}

export interface HealthGraphEdge {
  id: string;
  label: string;
  parentName: string;
  childName: string;
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
  elbowY: number;
  labelX: number;
  labelY: number;
}

export interface HealthGraphLayout {
  nodes: HealthGraphNode[];
  edges: HealthGraphEdge[];
  width: number;
  height: number;
  options: HealthGraphLayoutOptions;
  /** Relationships whose parent or child is missing from the entity list. */
  danglingRelationships: number;
}

interface EntityIconProperties {
  icon?: {
    iconName?: string;
  };
}

export function buildHealthGraph(
  entities: HealthModelEntity[],
  relationships: HealthModelRelationship[],
  layoutOptions: Partial<HealthGraphLayoutOptions> = {}
): HealthGraphLayout {
  const options = { ...DEFAULT_HEALTH_GRAPH_LAYOUT, ...layoutOptions };
  const entitiesByName = new Map<string, HealthModelEntity>();
  for (const entity of entities) {
    entitiesByName.set(entity.name, entity);
  }

  const childNames = new Map<string, string[]>();
  const childToParent = new Map<string, string>();
  const edgeLabels = new Map<string, string>();
  let danglingRelationships = 0;

  // Relationships reference entities by name. Sorting keeps the rendered tree stable across
  // refreshes, because ARM does not guarantee a consistent relationship order.
  const orderedRelationships = [...relationships].sort((left, right) => left.name.localeCompare(right.name));

  for (const relationship of orderedRelationships) {
    const parentName = relationship.properties?.parentEntityName;
    const childName = relationship.properties?.childEntityName;

    if (!parentName || !childName || !entitiesByName.has(parentName) || !entitiesByName.has(childName)) {
      danglingRelationships++;
      continue;
    }

    // A child reached from several parents is drawn under the first one so the result stays a
    // tree; the duplicate edge is dropped rather than crossing the layout.
    if (childToParent.has(childName) || childName === parentName) {
      continue;
    }

    childToParent.set(childName, parentName);
    edgeLabels.set(childName, relationship.properties?.displayName ?? relationship.name);
    const siblings = childNames.get(parentName);
    if (siblings) {
      siblings.push(childName);
    } else {
      childNames.set(parentName, [childName]);
    }
  }

  const rootNames = [...entitiesByName.keys()]
    .filter((name) => !childToParent.has(name))
    .sort((left, right) => compareByDisplayName(entitiesByName, left, right));

  const nodes: HealthGraphNode[] = [];
  const nodesByName = new Map<string, HealthGraphNode>();
  const placed = new Set<string>();
  let cursorX = 0;

  const place = (name: string, depth: number): number => {
    // Guards against a relationship cycle, which would otherwise recurse forever.
    if (placed.has(name)) {
      return cursorX;
    }
    placed.add(name);

    const entity = entitiesByName.get(name)!;
    const children = (childNames.get(name) ?? [])
      .filter((childName) => !placed.has(childName))
      .sort((left, right) => compareByDisplayName(entitiesByName, left, right));

    let centerX: number;
    if (children.length === 0) {
      centerX = cursorX + options.nodeWidth / 2;
      cursorX += options.nodeWidth + options.horizontalGap;
    } else {
      const childCenters = children.map((childName) => place(childName, depth + 1));
      centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    }

    const node: HealthGraphNode = {
      name,
      displayName: entity.properties?.displayName ?? entity.name,
      healthState: entity.properties?.healthState,
      iconName: (entity.properties as EntityIconProperties | undefined)?.icon?.iconName,
      entity,
      depth,
      x: centerX - options.nodeWidth / 2,
      y: depth * (options.nodeHeight + options.verticalGap),
    };
    nodes.push(node);
    nodesByName.set(name, node);
    return centerX;
  };

  for (const rootName of rootNames) {
    place(rootName, 0);
  }

  // Entities only reachable through a cycle never appear as roots, so place whatever is left.
  for (const name of entitiesByName.keys()) {
    if (!placed.has(name)) {
      place(name, 0);
    }
  }

  const edges: HealthGraphEdge[] = [];
  for (const [childName, parentName] of childToParent) {
    const childNode = nodesByName.get(childName);
    const parentNode = nodesByName.get(parentName);
    if (!childNode || !parentNode) {
      continue;
    }

    // Stagger by rendered left-to-right order rather than relationship order, because only
    // horizontally adjacent labels can collide.
    const siblings = (childNames.get(parentName) ?? [])
      .filter((name) => nodesByName.has(name))
      .sort((left, right) => nodesByName.get(left)!.x - nodesByName.get(right)!.x);
    const siblingIndex = Math.max(0, siblings.indexOf(childName));
    const parentX = parentNode.x + options.nodeWidth / 2;
    const parentY = parentNode.y + options.nodeHeight;
    const childX = childNode.x + options.nodeWidth / 2;
    const elbowY = parentY + options.verticalGap / 2;

    edges.push({
      id: `${parentName}->${childName}`,
      label: edgeLabels.get(childName) ?? '',
      parentName,
      childName,
      parentX,
      parentY,
      childX,
      childY: childNode.y,
      elbowY,
      labelX: childX,
      // Alternating offsets keep adjacent sibling labels from overlapping.
      labelY: elbowY - options.labelStagger / 2 + (siblingIndex % 2) * options.labelStagger,
    });
  }

  edges.sort((left, right) => left.id.localeCompare(right.id));

  const maxDepth = nodes.reduce((depth, node) => Math.max(depth, node.depth), 0);
  const width = nodes.reduce((value, node) => Math.max(value, node.x + options.nodeWidth), 0);

  return {
    nodes,
    edges,
    width,
    height: nodes.length === 0 ? 0 : (maxDepth + 1) * options.nodeHeight + maxDepth * options.verticalGap,
    options,
    danglingRelationships,
  };
}

function compareByDisplayName(entities: Map<string, HealthModelEntity>, left: string, right: string): number {
  const leftName = entities.get(left)?.properties?.displayName ?? left;
  const rightName = entities.get(right)?.properties?.displayName ?? right;
  const byDisplayName = leftName.localeCompare(rightName);
  return byDisplayName === 0 ? left.localeCompare(right) : byDisplayName;
}
