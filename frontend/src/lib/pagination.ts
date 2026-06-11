export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return {
    page: safePage,
    pageCount,
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize)
  };
}
