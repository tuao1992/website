/**
 * Run `tasks` with at most `limit` in flight, invoking `onResult` as each settles.
 * Results are reported in completion order, which is what lets the UI stream rows.
 */
export async function runPool<TIn, TOut>(
  items: readonly TIn[],
  limit: number,
  worker: (item: TIn, index: number) => Promise<TOut>,
  onResult?: (result: TOut, index: number) => void | Promise<void>,
): Promise<TOut[]> {
  const results = new Array<TOut>(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  async function runner(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const result = await worker(items[index] as TIn, index);
      results[index] = result;
      if (onResult) await onResult(result, index);
    }
  }

  await Promise.all(Array.from({ length: width }, runner));
  return results;
}
