/** Max portrait jobs processed in parallel for one order. */
export const ORDER_JOB_CONCURRENCY = 6;
/** Max portrait jobs in flight across all orders in this process. */
export const GLOBAL_JOB_CONCURRENCY = 12;

export class Semaphore {
  private active = 0;
  private readonly waiters: (() => void)[] = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.waiters.shift();
      if (next) next();
    }
  }
}

export const generationSemaphore = new Semaphore(GLOBAL_JOB_CONCURRENCY);
