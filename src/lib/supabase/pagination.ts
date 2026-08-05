export type SupabasePage<T, E> = {
  data: T[] | null;
  error: E | null;
};

export async function collectAllSupabasePages<T, E>(
  fetchPage: (from: number, to: number) => PromiseLike<SupabasePage<T, E>>,
  pageSize = 500,
): Promise<SupabasePage<T, E>> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive safe integer");
  }

  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.error) return { data: null, error: page.error };

    const pageRows = page.data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return { data: rows, error: null };
  }
}
