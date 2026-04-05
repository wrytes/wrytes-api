import type { Rate, PriceSourceId } from './prices.types';

interface GraphEdge {
  value: number;
  source: PriceSourceId;
  fetchedAt: Date;
}

/**
 * Directed weighted graph of exchange rates.
 * Each edge A→B means "1 A = value B". Inverse edges are stored automatically.
 * Use `resolve()` to find the price of any token in any currency via BFS.
 */
export class RateGraph {
  private readonly edges = new Map<string, Map<string, GraphEdge>>();

  add(from: string, to: string, value: number, source: PriceSourceId, fetchedAt = new Date()): void {
    if (!isFinite(value) || value <= 0) return;
    this.setEdge(from, to, value, source, fetchedAt);
    this.setEdge(to, from, 1 / value, source, fetchedAt);
  }

  private setEdge(from: string, to: string, value: number, source: PriceSourceId, fetchedAt: Date): void {
    if (!this.edges.has(from)) this.edges.set(from, new Map());
    const existing = this.edges.get(from)!.get(to);
    // Keep the most recently fetched rate if multiple sources cover the same edge
    if (!existing || fetchedAt >= existing.fetchedAt) {
      this.edges.get(from)!.set(to, { value, source, fetchedAt });
    }
  }

  /**
   * Find the price of 1 `from` in `to` via BFS.
   * Returns null if no path exists within `maxDepth` hops.
   */
  resolve(from: string, to: string, maxDepth = 3): number | null {
    if (from === to) return 1;

    const queue: Array<{ node: string; rate: number; depth: number }> = [
      { node: from, rate: 1, depth: 0 },
    ];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { node, rate, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const neighbors = this.edges.get(node);
      if (!neighbors) continue;

      for (const [neighbor, edge] of neighbors) {
        const newRate = rate * edge.value;
        if (neighbor === to) return newRate;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, rate: newRate, depth: depth + 1 });
        }
      }
    }

    return null;
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
