/** Small in-process token bucket. Redis-backed limits land with horizontal scaling. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true when the action is allowed, and records the hit. */
  take(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((time) => time > windowStart);

    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    if (this.hits.size > 5000) {
      for (const [entry, times] of this.hits) {
        if (times.every((time) => time <= windowStart)) this.hits.delete(entry);
      }
    }

    return true;
  }
}
