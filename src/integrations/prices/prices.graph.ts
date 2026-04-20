import type { Rate, PriceSourceId } from './prices.types';
import { ROUTING_SOURCES } from './prices.types';

export interface RouteHop {
  from: string;
  to: string;
  source: PriceSourceId;
  protocols?: string[];
}

/**
 * A single executable transaction leg.
 * Consecutive same-source hops are collapsed into one leg since they execute in one tx.
 * `via` lists intermediate tokens the source routes through internally.
 */
export interface RouteLeg {
  from: string;
  to: string;
  source: PriceSourceId;
  via: string[];
  protocols?: string[];
}

export interface Route {
  rate: number;
  legs: RouteLeg[];
}

interface GraphEdge {
  value: number;
  source: PriceSourceId;
  fetchedAt: Date;
  protocols?: string[];
  synthetic: boolean;
}

const MAX_EDGE_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * Directed weighted graph of exchange rates.
 * Each edge A→B means "1 A = value B". Inverse edges are stored automatically.
 * Direct quotes always take precedence over synthetic inverses.
 * Use `resolve()` to find the price of any token in any currency via BFS.
 */
export class RateGraph {
  private readonly edges = new Map<string, Map<string, GraphEdge>>();

  add(from: string, to: string, value: number, source: PriceSourceId, fetchedAt = new Date(), protocols?: string[]): void {
    if (!isFinite(value) || value <= 0) return;
    this.setEdge(from, to, value, source, fetchedAt, protocols, false);
    this.setEdge(to, from, 1 / value, source, fetchedAt, protocols, true);
  }

  private setEdge(from: string, to: string, value: number, source: PriceSourceId, fetchedAt: Date, protocols: string[] | undefined, synthetic: boolean): void {
    if (!this.edges.has(from)) this.edges.set(from, new Map());
    const existing = this.edges.get(from)!.get(to);
    // Real quote always beats synthetic inverse; among same kind, prefer newer
    if (!existing
      || (!synthetic && existing.synthetic)
      || (synthetic === existing.synthetic && fetchedAt >= existing.fetchedAt)) {
      this.edges.get(from)!.set(to, { value, source, fetchedAt, protocols, synthetic });
    }
  }

  private collapseToLegs(hops: RouteHop[]): RouteLeg[] {
    if (hops.length === 0) return [];
    const legs: RouteLeg[] = [];
    let leg: RouteLeg = { from: hops[0].from, to: hops[0].to, source: hops[0].source, via: [], protocols: hops[0].protocols };

    for (let i = 1; i < hops.length; i++) {
      const hop = hops[i];
      if (hop.source === leg.source) {
        leg.via.push(leg.to);
        leg.to = hop.to;
        if (hop.protocols) leg.protocols = [...(leg.protocols ?? []), ...hop.protocols];
      } else {
        legs.push(leg);
        leg = { from: hop.from, to: hop.to, source: hop.source, via: [], protocols: hop.protocols };
      }
    }
    legs.push(leg);
    return legs;
  }

  /**
   * Find the price of 1 `from` in `to` via BFS.
   * Returns null if no path exists within `maxDepth` hops.
   */
  resolve(from: string, to: string, maxDepth = 3): number | null {
    return this.resolveWithPath(from, to, maxDepth)?.rate ?? null;
  }

  /**
   * Returns the best-priced tradeable path between two nodes,
   * only traversing edges from actual trading venues (ROUTING_SOURCES).
   */
  resolveWithPath(from: string, to: string, maxDepth = 4): Route | null {
    if (from === to) return { rate: 1, legs: [] };
    return this.findAllRoutes(from, to, maxDepth)[0] ?? null;
  }

  /**
   * Finds all simple tradeable paths between two nodes via DFS,
   * only traversing edges from actual trading venues (ROUTING_SOURCES).
   * Skips edges older than 12 hours.
   * Consecutive same-source hops are collapsed into a single transaction leg.
   */
  findAllRoutes(from: string, to: string, maxDepth = 4): Route[] {
    const routes: Route[] = [];
    const now = Date.now();

    const dfs = (node: string, visited: Set<string>, hops: RouteHop[], rate: number) => {
      if (node === to) {
        routes.push({ rate, legs: this.collapseToLegs([...hops]) });
        return;
      }
      if (hops.length >= maxDepth) return;

      const neighbors = this.edges.get(node);
      if (!neighbors) return;

      for (const [neighbor, edge] of neighbors) {
        if (!ROUTING_SOURCES.includes(edge.source)) continue;
        if (now - edge.fetchedAt.getTime() > MAX_EDGE_AGE_MS) continue;
        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        hops.push({ from: node, to: neighbor, source: edge.source, protocols: edge.protocols });
        dfs(neighbor, visited, hops, rate * edge.value);
        hops.pop();
        visited.delete(neighbor);
      }
    };

    dfs(from, new Set([from]), [], 1);
    return routes.sort((a, b) => b.rate - a.rate);
  }

  getAllRates(): Rate[] {
    const rates: Rate[] = [];
    for (const [from, neighbors] of this.edges) {
      for (const [to, edge] of neighbors) {
        rates.push({ from, to, ...edge });
      }
    }
    return rates;
  }
}
