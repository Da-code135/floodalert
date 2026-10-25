import { ROUTE_EDGES, ROUTE_NODES } from "@/data/kampala";
import { riskLevelFromScore } from "@/lib/risk";
import { nearestHotspot } from "@/lib/triage";
import type {
  DivisionRisk,
  RouteComparison,
  RouteOption,
  SafeRouteEdge,
  SafeRouteNode,
} from "@/lib/types";

type AdjacencyEdge = {
  edge: SafeRouteEdge;
  other: string;
  penalty: number;
};

export function computeNodeRisks(
  risks: DivisionRisk[],
): Record<string, number> {
  const byDivision = new Map(
    risks.map((risk) => [risk.division, risk.score]),
  );

  return Object.fromEntries(
    ROUTE_NODES.map((node) => {
      const hotspot = nearestHotspot(node.lat, node.lng, node.division);
      const divisionRisk = byDivision.get(node.division) ?? 52;
      return [
        node.id,
        Math.round(divisionRisk * 0.62 + hotspot.exposure * 0.38),
      ];
    }),
  );
}

export function penaltyForEdge(
  fromRisk: number,
  toRisk: number,
): number {
  const average = (fromRisk + toRisk) / 2;
  if (average >= 88) return 12;
  if (average >= 80) return 8;
  if (average >= 72) return 5;
  if (average >= 64) return 2;
  return 0;
}

function buildAdjacency(
  nodeRisks: Record<string, number>,
): Map<string, AdjacencyEdge[]> {
  const adjacency = new Map<string, AdjacencyEdge[]>();

  for (const edge of ROUTE_EDGES) {
    const penalty = penaltyForEdge(
      nodeRisks[edge.from] ?? 50,
      nodeRisks[edge.to] ?? 50,
    );
    const forward = adjacency.get(edge.from) ?? [];
    forward.push({ edge, other: edge.to, penalty });
    adjacency.set(edge.from, forward);

    const backward = adjacency.get(edge.to) ?? [];
    backward.push({ edge, other: edge.from, penalty });
    adjacency.set(edge.to, backward);
  }

  return adjacency;
}

function dijkstra(
  fromId: string,
  toId: string,
  nodeRisks: Record<string, number>,
  mode: "safest" | "fastest",
): RouteOption | null {
  if (fromId === toId) return null;

  const adjacency = buildAdjacency(nodeRisks);
  const distances = new Map<string, number>();
  const previous = new Map<
    string,
    { node: string; edge: SafeRouteEdge; penalty: number }
  >();
  const visited = new Set<string>();

  for (const node of ROUTE_NODES) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
  }
  distances.set(fromId, 0);

  while (visited.size < ROUTE_NODES.length) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const [nodeId, distance] of distances) {
      if (!visited.has(nodeId) && distance < currentDistance) {
        current = nodeId;
        currentDistance = distance;
      }
    }

    if (!current || currentDistance === Number.POSITIVE_INFINITY) break;
    if (current === toId) break;
    visited.add(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const { edge, other, penalty } of neighbors) {
      const weight =
        edge.minutes + (mode === "safest" ? penalty : 0);
      const candidate = currentDistance + weight;
      if (candidate < (distances.get(other) ?? Number.POSITIVE_INFINITY)) {
        distances.set(other, candidate);
        previous.set(other, { node: current, edge, penalty });
      }
    }
  }

  if (!previous.has(toId)) return null;

  const pathIds: string[] = [toId];
  const pathEdges: SafeRouteEdge[] = [];
  let cursor = toId;
  let totalMinutes = 0;
  let totalPenalty = 0;

  while (cursor !== fromId) {
    const step = previous.get(cursor);
    if (!step) return null;
    pathIds.unshift(step.node);
    pathEdges.unshift(step.edge);
    totalMinutes += step.edge.minutes;
    totalPenalty += step.penalty;
    cursor = step.node;
  }

  const nodesById = new Map(ROUTE_NODES.map((node) => [node.id, node]));
  const path = pathIds
    .map((id) => nodesById.get(id))
    .filter((node): node is SafeRouteNode => Boolean(node));
  const risk = Math.max(...path.map((node) => nodeRisks[node.id] ?? 0));

  const warnings = pathEdges
    .flatMap((edge) => {
      const penalty = penaltyForEdge(
        nodeRisks[edge.from] ?? 50,
        nodeRisks[edge.to] ?? 50,
      );
      if (penalty < 2) return [];
      const level = riskLevelFromScore(
        ((nodeRisks[edge.from] ?? 50) + (nodeRisks[edge.to] ?? 50)) / 2,
      );
      const fromLabel = nodesById.get(edge.from)?.label ?? edge.from;
      const toLabel = nodesById.get(edge.to)?.label ?? edge.to;
      return [
        `${edge.road} (${fromLabel}–${toLabel}): ${level.toLowerCase()} flood risk, +${penalty} min`,
      ];
    })
    .sort((a, b) => b.length - a.length);

  return {
    kind: mode,
    path,
    edges: pathEdges,
    minutes: totalMinutes + totalPenalty,
    risk,
    warnings,
    safe: risk < 75 && totalPenalty <= 16,
    penalty: totalPenalty,
  };
}

export function findRoutes(
  fromId: string,
  toId: string,
  risks: DivisionRisk[],
): RouteComparison | null {
  const nodeRisks = computeNodeRisks(risks);
  const safest = dijkstra(fromId, toId, nodeRisks, "safest");
  const fastest = dijkstra(fromId, toId, nodeRisks, "fastest");
  if (!safest || !fastest) return null;
  return { safest, fastest };
}

export function routeNodeLabel(id: string): string {
  return ROUTE_NODES.find((node) => node.id === id)?.label ?? id;
}
