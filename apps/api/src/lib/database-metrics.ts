export class Histogram {
  private count = 0;
  private sum = 0;
  private counts: number[];
  constructor(private buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) { this.counts = buckets.map(() => 0); }
  observe(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    this.count++; this.sum += seconds;
    this.buckets.forEach((bound, i) => { if (seconds <= bound) this.counts[i]++; });
  }
  render(name: string, labels = "") {
    const prefix = labels ? `${labels},` : "";
    const suffix = labels ? `{${labels}}` : "";
    return [...this.buckets.map((bound, i) => `${name}_bucket{${prefix}le="${bound}"} ${this.counts[i]}`),
      `${name}_bucket{${prefix}le="+Inf"} ${this.count}`,
      `${name}_count${suffix} ${this.count}`, `${name}_sum${suffix} ${this.sum}`].join("\n");
  }
}
export const databaseQueryHistogram = new Histogram();
let databaseQueryErrors = 0;
export function observeDatabaseQuery(milliseconds: number, failed: boolean) {
  databaseQueryHistogram.observe(milliseconds / 1000);
  if (failed) databaseQueryErrors++;
}


export const getDatabaseQueryErrors = () => databaseQueryErrors;
